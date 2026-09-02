'use server';

import dns from 'node:dns/promises';
import { revalidatePath } from 'next/cache';
import * as XLSX from 'xlsx';
import { prisma } from '@/lib/prisma';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Rol, Prisma } from '@prisma/client';
import { CATEGORIAS_PRODUCTO, CategoriaProducto } from '@/lib/constants/categorias';
import { almacenarBufferImagenProducto } from '@/app/actions/admin/imagenes';
import { parsearVariantes, serializarVariantes } from '@/lib/utils/variantes';

// -----------------------------------------------------------------------------
// INTERFACES & TIPOS
// -----------------------------------------------------------------------------

export interface FilaExcelDatos {
  codigo: string;
  nombre: string;
  categoria: string;
  subcategoria: string | null;
  descripcion: string;
  presentacion: string;
  variantes?: string | null;
  modoUso: string | null;
  rendimientoSalon: string | null;
  precioPss: number;
  precioEcommerce: number;
  stock: number;
  activo: boolean;
  destacado: boolean;
  recomendado: boolean;
  ordenVisualizacion: number;
  imagen_url: string | null;
}

export interface FilaValidada {
  numeroFila: number;
  accion: 'CREAR' | 'ACTUALIZAR';
  datos: FilaExcelDatos;
  errores: string[];
}

export interface PrevisualizacionResultado {
  success: boolean;
  filas?: FilaValidada[];
  resumen?: {
    total: number;
    crear: number;
    actualizar: number;
    conError: number;
  };
  error?: string;
}

export interface AdvertenciaCarga {
  fila: number;
  codigo: string;
  mensaje: string;
}

export interface ResumenCargaMasiva {
  success: boolean;
  creados: number;
  actualizados: number;
  omitidos: number;
  totalProcesados: number;
  advertencias: AdvertenciaCarga[];
  error?: string;
}

// -----------------------------------------------------------------------------
// HELPER: VALIDACIÓN DE SEGURIDAD SSRF PARA URLs DE IMÁGENES
// -----------------------------------------------------------------------------

function esIpPrivadaOInsegura(ip: string): boolean {
  const cleanIp = ip.trim().toLowerCase();

  // IPv6 loopback / local / IPv4-mapped
  if (
    cleanIp === '::1' ||
    cleanIp === '::' ||
    cleanIp.startsWith('fe80:') || // Link-local IPv6
    cleanIp.startsWith('fc') || // Unique local address (ULA)
    cleanIp.startsWith('fd')
  ) {
    return true;
  }

  // IPv4-mapped IPv6 (::ffff:127.0.0.1)
  let ipv4 = cleanIp;
  if (cleanIp.startsWith('::ffff:')) {
    ipv4 = cleanIp.slice(7);
  }

  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = ipv4.match(ipv4Regex);
  if (match) {
    const o1 = Number(match[1]);
    const o2 = Number(match[2]);

    // 0.0.0.0/8
    if (o1 === 0) return true;
    // 127.0.0.0/8 (Loopback)
    if (o1 === 127) return true;
    // 10.0.0.0/8 (Privada Clase A)
    if (o1 === 10) return true;
    // 192.168.0.0/16 (Privada Clase C)
    if (o1 === 192 && o2 === 168) return true;
    // 172.16.0.0/12 (Privada Clase B)
    if (o1 === 172 && o2 >= 16 && o2 <= 31) return true;
    // 169.254.0.0/16 (Link-local / Metadatos de la nube)
    if (o1 === 169 && o2 === 254) return true;
    // 100.64.0.0/10 (Carrier-grade NAT)
    if (o1 === 100 && o2 >= 64 && o2 <= 127) return true;
    // 224.0.0.0/4 (Multicast) y 240.0.0.0/4 (Reservado)
    if (o1 >= 224) return true;
  }

  return false;
}

function esUrlSeguraParaDescarga(urlString: string): { segura: boolean; parsedUrl?: URL; error?: string } {
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { segura: false, error: 'Solo se permiten protocolos HTTP o HTTPS.' };
    }

    const host = parsed.hostname.toLowerCase();

    // Rechazar explícitamente localhost, dominios internos y especiales
    if (
      host === 'localhost' ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host.startsWith('127.')
    ) {
      return { segura: false, error: 'Dirección o host local no permitida por seguridad.' };
    }

    if (esIpPrivadaOInsegura(host)) {
      return { segura: false, error: 'Dirección IP privada o reservada no permitida.' };
    }

    return { segura: true, parsedUrl: parsed };
  } catch {
    return { segura: false, error: 'URL malformada o inválida.' };
  }
}

async function validarUrlYDns(url: string): Promise<string> {
  const check = esUrlSeguraParaDescarga(url);
  if (!check.segura || !check.parsedUrl) {
    throw new Error(check.error || 'URL insegura.');
  }

  const hostname = check.parsedUrl.hostname;

  // Resolver DNS real de las direcciones IPv4 / IPv6 del host
  try {
    const resolvedIps = await dns.lookup(hostname, { all: true });
    if (!resolvedIps || resolvedIps.length === 0) {
      throw new Error(`No se pudo resolver el nombre de host: ${hostname}`);
    }

    for (const record of resolvedIps) {
      if (esIpPrivadaOInsegura(record.address)) {
        throw new Error(
          `El host resuelve a una dirección IP privada o interna (${record.address}). Descarga rechazada por seguridad.`
        );
      }
    }
  } catch (dnsErr: any) {
    if (dnsErr.message?.includes('privada') || dnsErr.message?.includes('seguridad')) {
      throw dnsErr;
    }
    throw new Error(`Fallo de resolución DNS para "${hostname}": ${dnsErr.message || 'Host inaccesible'}`);
  }

  return url;
}

async function descargarImagenSegura(urlInicial: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout total

  try {
    let urlActual = urlInicial;
    let intentosRedirect = 0;
    const MAX_REDIRECTS = 5;
    const MAX_BYTES_IMAGEN = 5 * 1024 * 1024; // 5 MB

    while (intentosRedirect < MAX_REDIRECTS) {
      // 1. Validar URL sintáctica y resolución DNS contra IPs privadas antes de cada petición
      await validarUrlYDns(urlActual);

      // 2. Fetch con redirección manual (redirect: 'manual')
      const response = await fetch(urlActual, {
        signal: controller.signal,
        redirect: 'manual',
        headers: {
          'User-Agent': 'Steffen-Product-Importer/1.0',
          'Accept': 'image/jpeg,image/png,image/webp,*/*',
        },
      });

      // 3. Manejo de Redirecciones (3xx)
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location) {
          throw new Error(`El servidor respondió con redirección (${response.status}) sin cabecera Location.`);
        }

        // Resolver URL relativa o absoluta con base en la URL actual
        const nuevaUrl = new URL(location, urlActual).toString();
        urlActual = nuevaUrl;
        intentosRedirect++;
        continue;
      }

      if (!response.ok) {
        throw new Error(`El servidor de origen respondió con HTTP ${response.status}`);
      }

      // 4. Validar Content-Type
      const contentType = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() || '';
      const mimesValidos = ['image/jpeg', 'image/png', 'image/webp'];
      if (!mimesValidos.includes(contentType)) {
        throw new Error(`Formato de imagen no soportado (${contentType || 'desconocido'}). Solo JPEG, PNG o WebP.`);
      }

      // 5. Pre-chequeo con Content-Length si viene presente
      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength, 10) > MAX_BYTES_IMAGEN) {
        throw new Error('El archivo supera el tamaño máximo permitido de 5 MB.');
      }

      // 6. Lectura como STREAM con getReader() acumulando bytes y cortando en tiempo real si excede 5MB
      if (!response.body) {
        throw new Error('El cuerpo de la respuesta está vacío.');
      }

      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let totalBytesLeidos = 0;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          if (value) {
            totalBytesLeidos += value.length;
            if (totalBytesLeidos > MAX_BYTES_IMAGEN) {
              controller.abort();
              throw new Error('El archivo superó el límite de 5 MB durante la transferencia.');
            }
            chunks.push(value);
          }
        }
      } finally {
        reader.releaseLock();
      }

      return {
        buffer: Buffer.concat(chunks),
        contentType,
      };
    }

    throw new Error('Se superó el límite máximo de redirecciones (5).');
  } finally {
    clearTimeout(timeoutId);
  }
}

// Helper para parsear booleanos flexibles desde Excel (true, 'true', 'SI', '1', 1)
function parsearBooleano(valor: unknown, defaultValor: boolean = false): boolean {
  if (typeof valor === 'boolean') return valor;
  if (typeof valor === 'number') return valor === 1;
  if (typeof valor === 'string') {
    const v = valor.trim().toLowerCase();
    if (v === 'si' || v === 'sí' || v === 'true' || v === '1' || v === 's' || v === 'yes' || v === 'y') return true;
    if (v === 'no' || v === 'false' || v === '0' || v === 'n') return false;
  }
  return defaultValor;
}

// -----------------------------------------------------------------------------
// 1. GENERAR PLANTILLA EXCEL
// -----------------------------------------------------------------------------

export async function generarPlantillaExcelAction(): Promise<{
  success: boolean;
  dataBase64?: string;
  filename?: string;
  error?: string;
}> {
  try {
    // 1. Chequeo de autenticación en servidor
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'No autorizado. Debes iniciar sesión.' };
    }

    const usuario = await prisma.usuario.findUnique({
      where: { authUserId: user.id },
    });

    if (!usuario || usuario.rol !== Rol.ADMIN) {
      return { success: false, error: 'Acceso denegado. Se requieren permisos de Administrador.' };
    }

    // 2. Crear Libro de Trabajo
    const workbook = XLSX.utils.book_new();

    // 3. Hoja 1: Plantilla de Productos con Fila de Ejemplo
    const headers = [
      'codigo',
      'nombre',
      'categoria',
      'subcategoria',
      'descripcion',
      'presentacion',
      'variantes',
      'modoUso',
      'rendimientoSalon',
      'precioPss',
      'precioEcommerce',
      'stock',
      'activo',
      'destacado',
      'recomendado',
      'ordenVisualizacion',
      'imagen_url',
    ];

    const ejemploRow = [
      'SER-ARG-250',
      'Sérum Nutritivo con Argán y Macadamia',
      'Sérums y Cristales',
      'Nutrición Profunda',
      'Sérum capilar restaurador con aceite puro de argán. Otorga brillo instantáneo, sella puntas y elimina el frizz.',
      '250 ml',
      'Con Tapa Disctop:14500:21500 | Con Bomba Dosificadora:16500:24500',
      'Aplicar 2 a 4 gotas sobre la palma de las manos, frotar y distribuir de medios a puntas sobre cabello húmedo o seco.',
      'Aproximadamente 80 a 100 servicios de finalizado y sellado en tocador.',
      14500,
      21500,
      50,
      'SI',
      'NO',
      'SI',
      0,
      'https://ejemplo.com/imagenes/serum-argan.jpg',
    ];

    const ejemploRow2 = [
      'SHA-NUT-1000',
      'Shampoo Nutritivo Reparador',
      'Shampoo',
      'Línea Salon',
      'Shampoo profesional de limpieza profunda y nutrición capilar enriquecido con vitaminas.',
      '1000 ml',
      '',
      'Emulsionar en lavacabezas con agua tibia, masajear el cuero cabelludo durante 2 minutos y enjuagar con abundante agua.',
      'Rinde entre 50 y 60 lavados profesionales en lavacabezas.',
      18900,
      28500,
      30,
      'SI',
      'SI',
      'NO',
      1,
      '',
    ];

    const sheetData = [headers, ejemploRow, ejemploRow2];
    const wsProductos = XLSX.utils.aoa_to_sheet(sheetData);

    // Ajustar anchos de columnas para mejor legibilidad
    wsProductos['!cols'] = [
      { wch: 16 }, // codigo
      { wch: 38 }, // nombre
      { wch: 22 }, // categoria
      { wch: 22 }, // subcategoria
      { wch: 45 }, // descripcion
      { wch: 15 }, // presentacion
      { wch: 40 }, // variantes
      { wch: 45 }, // modoUso
      { wch: 40 }, // rendimientoSalon
      { wch: 14 }, // precioPss
      { wch: 16 }, // precioEcommerce
      { wch: 10 }, // stock
      { wch: 10 }, // activo
      { wch: 12 }, // destacado
      { wch: 14 }, // recomendado
      { wch: 18 }, // ordenVisualizacion
      { wch: 40 }, // imagen_url
    ];

    XLSX.utils.book_append_sheet(workbook, wsProductos, 'Productos');

    // 4. Hoja 2: Categorías Permitidas (Referencia)
    const categoriasData = [
      ['Categorías Válidas Oficiales Steffen', 'Descripción'],
      ...CATEGORIAS_PRODUCTO.map((cat) => [cat, 'Categoría permitida en el catálogo']),
    ];
    const wsCategorias = XLSX.utils.aoa_to_sheet(categoriasData);
    wsCategorias['!cols'] = [{ wch: 28 }, { wch: 40 }];

    XLSX.utils.book_append_sheet(workbook, wsCategorias, 'Categorías_Válidas');

    // 5. Generar buffer / base64
    const fileBuffer = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
    const filename = `plantilla_carga_masiva_productos_steffen_${new Date().toISOString().slice(0, 10)}.xlsx`;

    return {
      success: true,
      dataBase64: fileBuffer,
      filename,
    };
  } catch (error) {
    console.error('Error al generar plantilla Excel:', error);
    return {
      success: false,
      error: 'Ocurrió un error al generar la plantilla de Excel en el servidor.',
    };
  }
}

// -----------------------------------------------------------------------------
// 2. PREVISUALIZAR CARGA MASIVA (Solo lectura y validación)
// -----------------------------------------------------------------------------

export async function previsualizarCargaMasivaAction(formData: FormData): Promise<PrevisualizacionResultado> {
  try {
    // 1. Chequeo de autenticación en servidor
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'No autorizado. Debes iniciar sesión.' };
    }

    const usuario = await prisma.usuario.findUnique({
      where: { authUserId: user.id },
    });

    if (!usuario || usuario.rol !== Rol.ADMIN) {
      return { success: false, error: 'Acceso denegado. Se requieren permisos de Administrador.' };
    }

    // 2. Extraer el archivo .xlsx
    const file = formData.get('archivo') as File | null;
    if (!file || !(file instanceof File) || file.size === 0) {
      return { success: false, error: 'No se subió ningún archivo o el archivo está vacío.' };
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // 3. Parsear Excel
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(buffer, { type: 'buffer' });
    } catch {
      return { success: false, error: 'El archivo subido no es un archivo Excel (.xlsx o .xls) válido.' };
    }

    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return { success: false, error: 'El archivo Excel no contiene ninguna hoja con datos.' };
    }

    const worksheet = workbook.Sheets[firstSheetName];
    // Convertir a array de objetos
    const rowsRaw = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });

    if (!rowsRaw || rowsRaw.length === 0) {
      return { success: false, error: 'La hoja de Excel está vacía. No se encontraron filas de productos.' };
    }

    // 4. Obtener todos los productos existentes con código para mapeo rápido
    const productosExistentes = await prisma.producto.findMany({
      select: {
        id: true,
        codigo: true,
        nombre: true,
      },
    });

    const codigosExistentesMap = new Set<string>();
    productosExistentes.forEach((p) => {
      if (p.codigo) codigosExistentesMap.add(p.codigo.trim().toUpperCase());
    });

    // 5. Validar cada fila
    const filasValidadas: FilaValidada[] = [];
    const codigosVistosEnEsteExcel = new Set<string>();

    let countCrear = 0;
    let countActualizar = 0;
    let countError = 0;

    for (let index = 0; index < rowsRaw.length; index++) {
      const raw = rowsRaw[index];
      const numeroFila = index + 2; // +2 por la cabecera (fila 1) en Excel
      const errores: string[] = [];

      // Extraer campos (normalizando keys a minúsculas para robustez si el usuario escribió con mayúsculas)
      const rawNormalized: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(raw)) {
        rawNormalized[k.trim().toLowerCase()] = v;
      }

      // Código
      const codigoRaw = String(rawNormalized['codigo'] ?? '').trim();
      const codigo = codigoRaw.toUpperCase();

      if (!codigo) {
        errores.push('El campo "codigo" es obligatorio.');
      } else if (codigosVistosEnEsteExcel.has(codigo)) {
        errores.push(`El código "${codigo}" está duplicado en el mismo archivo Excel.`);
      } else {
        codigosVistosEnEsteExcel.add(codigo);
      }

      // Nombre
      const nombre = String(rawNormalized['nombre'] ?? '').trim();
      if (!nombre) {
        errores.push('El campo "nombre" es obligatorio.');
      }

      // Categoría
      const categoriaRaw = String(rawNormalized['categoria'] ?? '').trim();
      const categoriaValida = CATEGORIAS_PRODUCTO.find(
        (c) => c.toLowerCase() === categoriaRaw.toLowerCase()
      );

      if (!categoriaRaw) {
        errores.push('El campo "categoria" es obligatorio.');
      } else if (!categoriaValida) {
        errores.push(
          `La categoría "${categoriaRaw}" no es válida. Categorías permitidas: ${CATEGORIAS_PRODUCTO.join(', ')}.`
        );
      }
      const categoria = categoriaValida || categoriaRaw;

      // Subcategoría
      const subcategoriaRaw = String(rawNormalized['subcategoria'] ?? '').trim();
      const subcategoria = subcategoriaRaw || null;

      // Presentación
      const presentacion = String(rawNormalized['presentacion'] ?? '').trim();
      if (!presentacion) {
        errores.push('El campo "presentacion" es obligatorio (ej: 250 ml, 1000 ml).');
      }

      // Variantes (opcional, ej: "Con Tapa Disctop:14500:21500 | Con Bomba:16500:24500" o JSON)
      const variantesRaw = String(
        rawNormalized['variantes'] ?? rawNormalized['variante'] ?? rawNormalized['opciones'] ?? ''
      ).trim();
      let variantesSerializadas: string | null = null;
      if (variantesRaw) {
        const variantesParseadas = parsearVariantes(variantesRaw);
        if (variantesParseadas.length > 0) {
          variantesSerializadas = serializarVariantes(variantesParseadas);
        } else {
          errores.push('El formato de "variantes" no es válido. Usa "Nombre:precioPss:precioEcommerce" separado por "|" o formato JSON.');
        }
      }

      // Modo de uso profesional
      const modoUsoRaw = String(
        rawNormalized['modouso'] ?? rawNormalized['modo_uso'] ?? rawNormalized['mododeuso'] ?? ''
      ).trim();
      const modoUso = modoUsoRaw || null;

      // Rendimiento en salón
      const rendimientoRaw = String(
        rawNormalized['rendimientosalon'] ??
          rawNormalized['rendimiento_salon'] ??
          rawNormalized['rendimiento'] ??
          rawNormalized['rendimientoensalon'] ??
          ''
      ).trim();
      const rendimientoSalon = rendimientoRaw || null;

      // Descripción
      const descripcion = String(rawNormalized['descripcion'] ?? '').trim();
      if (!descripcion) {
        errores.push('El campo "descripcion" es obligatorio.');
      }

      // Precios
      const precioPssNum = Number(rawNormalized['preciopss'] ?? rawNormalized['precio_pss'] ?? 0);
      if (isNaN(precioPssNum) || precioPssNum <= 0) {
        errores.push('El campo "precioPss" debe ser un número mayor a 0.');
      }

      const precioEcomNum = Number(
        rawNormalized['precioecommerce'] ?? rawNormalized['precio_ecommerce'] ?? rawNormalized['preciopublico'] ?? 0
      );
      if (isNaN(precioEcomNum) || precioEcomNum <= 0) {
        errores.push('El campo "precioEcommerce" debe ser un número mayor a 0.');
      }

      // Stock
      const stockRaw = Number(rawNormalized['stock'] ?? 0);
      if (isNaN(stockRaw) || !Number.isInteger(stockRaw) || stockRaw < 0) {
        errores.push('El campo "stock" debe ser un número entero mayor o igual a 0.');
      }
      const stock = Math.max(0, Math.floor(isNaN(stockRaw) ? 0 : stockRaw));

      // Flags
      const activo = parsearBooleano(rawNormalized['activo'], true);
      const destacado = parsearBooleano(rawNormalized['destacado'], false);
      const recomendado = parsearBooleano(rawNormalized['recomendado'], false);

      // Orden de visualización
      const ordenRaw = Number(rawNormalized['ordenvisualizacion'] ?? rawNormalized['orden'] ?? 0);
      const ordenVisualizacion = !isNaN(ordenRaw) && Number.isInteger(ordenRaw) ? Math.max(0, Math.floor(ordenRaw)) : 0;

      // Imagen URL
      const imagenUrlRaw = String(rawNormalized['imagen_url'] ?? rawNormalized['imagenurl'] ?? rawNormalized['imagen'] ?? '').trim();
      const imagen_url = imagenUrlRaw || null;

      // Si trae imagen_url, pre-validar formato de URL
      if (imagen_url) {
        const urlCheck = esUrlSeguraParaDescarga(imagen_url);
        if (!urlCheck.segura) {
          errores.push(`URL de imagen no permitida: ${urlCheck.error}`);
        }
      }

      // Determinar acción: CREAR o ACTUALIZAR
      const existe = codigo ? codigosExistentesMap.has(codigo) : false;
      const accion: 'CREAR' | 'ACTUALIZAR' = existe ? 'ACTUALIZAR' : 'CREAR';

      if (errores.length > 0) {
        countError++;
      } else if (accion === 'CREAR') {
        countCrear++;
      } else {
        countActualizar++;
      }

      filasValidadas.push({
        numeroFila,
        accion,
        datos: {
          codigo,
          nombre,
          categoria,
          subcategoria,
          descripcion,
          presentacion,
          variantes: variantesSerializadas,
          modoUso,
          rendimientoSalon,
          precioPss: isNaN(precioPssNum) ? 0 : precioPssNum,
          precioEcommerce: isNaN(precioEcomNum) ? 0 : precioEcomNum,
          stock,
          activo,
          destacado,
          recomendado,
          ordenVisualizacion,
          imagen_url,
        },
        errores,
      });
    }

    return {
      success: true,
      filas: filasValidadas,
      resumen: {
        total: filasValidadas.length,
        crear: countCrear,
        actualizar: countActualizar,
        conError: countError,
      },
    };
  } catch (error) {
    console.error('Error al previsualizar carga masiva:', error);
    return {
      success: false,
      error: 'Ocurrió un error inesperado al procesar el archivo Excel.',
    };
  }
}

// -----------------------------------------------------------------------------
// 3. CONFIRMAR CARGA MASIVA
// -----------------------------------------------------------------------------

export async function confirmarCargaMasivaAction(filas: FilaValidada[]): Promise<ResumenCargaMasiva> {
  try {
    // 1. Chequeo de autenticación en servidor
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        creados: 0,
        actualizados: 0,
        omitidos: 0,
        totalProcesados: 0,
        advertencias: [],
        error: 'No autorizado. Debes iniciar sesión.',
      };
    }

    const usuario = await prisma.usuario.findUnique({
      where: { authUserId: user.id },
    });

    if (!usuario || usuario.rol !== Rol.ADMIN) {
      return {
        success: false,
        creados: 0,
        actualizados: 0,
        omitidos: 0,
        totalProcesados: 0,
        advertencias: [],
        error: 'Acceso denegado. Se requieren permisos de Administrador.',
      };
    }

    if (!filas || !Array.isArray(filas) || filas.length === 0) {
      return {
        success: false,
        creados: 0,
        actualizados: 0,
        omitidos: 0,
        totalProcesados: 0,
        advertencias: [],
        error: 'No se recibieron filas válidas para procesar.',
      };
    }

    let creados = 0;
    let actualizados = 0;
    let omitidos = 0;
    const advertencias: AdvertenciaCarga[] = [];

    // Conjunto para detectar duplicados en el payload entrante
    const codigosProcesados = new Set<string>();

    for (const fila of filas) {
      const { numeroFila, datos } = fila;

      // RE-VALIDACIÓN COMPLETA DESDE CERO (Zero Trust)
      const codigo = datos.codigo?.trim().toUpperCase();
      const nombre = datos.nombre?.trim();
      const categoria = datos.categoria?.trim();
      const presentacion = datos.presentacion?.trim();
      const descripcion = datos.descripcion?.trim();
      const precioPss = Number(datos.precioPss);
      const precioEcommerce = Number(datos.precioEcommerce);
      const stock = Number(datos.stock);

      const isValid =
        codigo &&
        nombre &&
        categoria &&
        CATEGORIAS_PRODUCTO.includes(categoria as CategoriaProducto) &&
        presentacion &&
        descripcion &&
        !isNaN(precioPss) &&
        precioPss > 0 &&
        !isNaN(precioEcommerce) &&
        precioEcommerce > 0 &&
        !isNaN(stock) &&
        Number.isInteger(stock) &&
        stock >= 0 &&
        !codigosProcesados.has(codigo);

      if (!isValid) {
        omitidos++;
        continue;
      }

      codigosProcesados.add(codigo);

      // Buscar si el producto ya existe en la base de datos
      const existente = await prisma.producto.findUnique({
        where: { codigo },
      });

      // Procesamiento seguro de imagen si trae imagen_url
      let urlImagenFinal: string | null = null;

      if (datos.imagen_url?.trim()) {
        try {
          const resultadoDescarga = await descargarImagenSegura(datos.imagen_url.trim());
          if (resultadoDescarga) {
            const uploadResultado = await almacenarBufferImagenProducto(
              resultadoDescarga.buffer,
              resultadoDescarga.contentType
            );

            if (uploadResultado.success && uploadResultado.url) {
              urlImagenFinal = uploadResultado.url;
            } else {
              advertencias.push({
                fila: numeroFila,
                codigo,
                mensaje: `No se pudo almacenar la imagen en Supabase (${uploadResultado.error || 'error desconocido'}). Se conservó la configuración del producto.`,
              });
            }
          }
        } catch (errDescarga: any) {
          advertencias.push({
            fila: numeroFila,
            codigo,
            mensaje: `Error al descargar imagen: ${errDescarga.message || 'falla de conexión'}. El producto se procesó igual.`,
          });
        }
      }

      const subcategoria = datos.subcategoria?.trim() || null;
      const modoUso = datos.modoUso?.trim() || null;
      const rendimientoSalon = datos.rendimientoSalon?.trim() || null;
      const variantes = datos.variantes || null;
      const activo = Boolean(datos.activo);
      const destacado = Boolean(datos.destacado);
      const recomendado = Boolean(datos.recomendado);
      const ordenVisualizacion = Number.isInteger(Number(datos.ordenVisualizacion))
        ? Math.max(0, Number(datos.ordenVisualizacion))
        : 0;

      if (existente) {
        // ACTUALIZAR PRODUCTO
        await prisma.producto.update({
          where: { id: existente.id },
          data: {
            nombre,
            categoria,
            subcategoria,
            descripcion,
            presentacion,
            ...(variantes !== null ? { variantes } : {}),
            ...(modoUso !== null ? { modoUso } : {}),
            ...(rendimientoSalon !== null ? { rendimientoSalon } : {}),
            precioPss: new Prisma.Decimal(precioPss),
            precioEcommerce: new Prisma.Decimal(precioEcommerce),
            stock,
            activo,
            destacado,
            recomendado,
            ordenVisualizacion,
            ...(urlImagenFinal ? { imagen: urlImagenFinal } : {}),
          },
        });
        actualizados++;
      } else {
        // CREAR PRODUCTO
        // Si no se pudo obtener imagen, asignar imagen de respaldo genérica o vacía
        const imagenParaCrear = urlImagenFinal || '/loguito.png';

        await prisma.producto.create({
          data: {
            codigo,
            nombre,
            categoria,
            subcategoria,
            descripcion,
            presentacion,
            variantes,
            modoUso,
            rendimientoSalon,
            imagen: imagenParaCrear,
            precioPss: new Prisma.Decimal(precioPss),
            precioEcommerce: new Prisma.Decimal(precioEcommerce),
            stock,
            activo,
            destacado,
            recomendado,
            ordenVisualizacion,
          },
        });
        creados++;
      }
    }

    // Revalidar rutas afectadas
    revalidatePath('/admin');
    revalidatePath('/admin/productos');
    revalidatePath('/catalogo');
    revalidatePath('/carrito');

    return {
      success: true,
      creados,
      actualizados,
      omitidos,
      totalProcesados: creados + actualizados,
      advertencias,
    };
  } catch (error) {
    console.error('Error al confirmar carga masiva:', error);
    return {
      success: false,
      creados: 0,
      actualizados: 0,
      omitidos: 0,
      totalProcesados: 0,
      advertencias: [],
      error: 'Ocurrió un error inesperado al procesar la carga masiva en la base de datos.',
    };
  }
}
