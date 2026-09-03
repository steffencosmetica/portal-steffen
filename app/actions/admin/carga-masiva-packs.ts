'use server';

import dns from 'node:dns/promises';
import { revalidatePath } from 'next/cache';
import * as XLSX from 'xlsx';
import { prisma } from '@/lib/prisma';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Rol, Prisma } from '@prisma/client';
import { ETIQUETAS_PACK, ETIQUETAS_PACK_CONFIG, EtiquetaPack } from '@/lib/constants/packs';
import { almacenarBufferImagenProducto } from '@/app/actions/admin/imagenes';
import { parsearProductosPack } from '@/lib/utils/packs';

// -----------------------------------------------------------------------------
// INTERFACES & TIPOS DE CARGA MASIVA DE PACKS
// -----------------------------------------------------------------------------

export interface FilaExcelPackDatos {
  codigo: string;
  nombre: string;
  etiqueta: string | null;
  descripcion: string;
  productos: string;           // Productos componentes: SKU_o_Nombre:Cantidad | SKU_o_Nombre:Cantidad
  descuentoConDistribuidor: number; // % Descuento para clientes con distribuidor asignado
  descuentoSinDistribuidor: number; // % Descuento para clientes sin distribuidor asignado (venta directa fábrica)
  precioBaseCalculado: number;      // Precio base calculado automáticamente (suma de PSS individual de los productos)
  precioDistribuidorCalculado: number; // Precio final calculado con distribuidor activo
  precioDirectoCalculado: number;      // Precio final calculado sin distribuidor activo (venta directa fábrica)
  activo: boolean;
  destacado: boolean;
  ordenVisualizacion: number;
  imagen_url: string | null;
  itemsValidadosCount?: number;
}

export interface FilaPackValidada {
  numeroFila: number;
  accion: 'CREAR' | 'ACTUALIZAR';
  datos: FilaExcelPackDatos;
  errores: string[];
}

export interface PrevisualizacionPacksResultado {
  success: boolean;
  filas?: FilaPackValidada[];
  resumen?: {
    total: number;
    crear: number;
    actualizar: number;
    conError: number;
  };
  error?: string;
}

export interface AdvertenciaCargaPack {
  fila: number;
  codigo: string;
  mensaje: string;
}

export interface ResumenCargaMasivaPacks {
  success: boolean;
  creados: number;
  actualizados: number;
  omitidos: number;
  totalProcesados: number;
  advertencias: AdvertenciaCargaPack[];
  error?: string;
}

// -----------------------------------------------------------------------------
// HELPERS DE SEGURIDAD & VALIDACIÓN
// -----------------------------------------------------------------------------

function esIpPrivada(ip: string): boolean {
  if (ip === 'localhost' || ip === '127.0.0.1' || ip === '::1') return true;
  if (ip.startsWith('10.')) return true;
  if (ip.startsWith('192.168.')) return true;
  if (ip.startsWith('172.')) {
    const segundoOcteto = parseInt(ip.split('.')[1], 10);
    if (segundoOcteto >= 16 && segundoOcteto <= 31) return true;
  }
  if (ip.startsWith('169.254.')) return true;
  if (ip.startsWith('fc00:') || ip.startsWith('fd00:')) return true;
  if (ip.startsWith('fe80:')) return true;
  return false;
}

function esUrlSeguraParaDescarga(urlStr: string): { segura: boolean; error?: string } {
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { segura: false, error: 'Solo se permiten URLs con protocolo http o https.' };
    }
    const hostname = parsed.hostname.toLowerCase();
    if (esIpPrivada(hostname)) {
      return { segura: false, error: 'Dirección de red no permitida por seguridad.' };
    }
    return { segura: true };
  } catch {
    return { segura: false, error: 'URL malformada.' };
  }
}

async function descargarYValidarImagenSegura(
  urlStr: string
): Promise<{ buffer?: Buffer; mimeType?: string; error?: string }> {
  const check = esUrlSeguraParaDescarga(urlStr);
  if (!check.segura) {
    return { error: check.error || 'URL no segura' };
  }

  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname;

    const ips = await dns.resolve(host).catch(() => [] as string[]);
    for (const ip of ips) {
      if (esIpPrivada(ip)) {
        return { error: `La dirección resuelta para ${host} (${ip}) está restringida.` };
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(urlStr, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'SteffenCosmetica-PackUploader/1.0',
        Accept: 'image/jpeg,image/png,image/webp,image/avif',
      },
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return { error: `HTTP ${res.status}: ${res.statusText}` };
    }

    const contentType = res.headers.get('content-type') || '';
    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/jpg'];
    const mimeValido = tiposPermitidos.find((t) => contentType.toLowerCase().includes(t));

    if (!mimeValido) {
      return { error: `Tipo de archivo no soportado: ${contentType}` };
    }

    const arrayBuf = await res.arrayBuffer();
    if (arrayBuf.byteLength > 8 * 1024 * 1024) {
      return { error: 'La imagen excede el límite permitido de 8MB.' };
    }

    return {
      buffer: Buffer.from(arrayBuf),
      mimeType: mimeValido === 'image/jpg' ? 'image/jpeg' : mimeValido,
    };
  } catch (error: any) {
    return { error: error?.message || 'Fallo de descarga de imagen' };
  }
}

function parsearBooleano(val: any, fallback = false): boolean {
  if (val === undefined || val === null) return fallback;
  if (typeof val === 'boolean') return val;
  const str = String(val).trim().toLowerCase();
  if (['si', 's', 'true', '1', 'yes', 'y', 'activo', 'habilitado'].includes(str)) return true;
  if (['no', 'n', 'false', '0', 'inactivo', 'deshabilitado'].includes(str)) return false;
  return fallback;
}

// -----------------------------------------------------------------------------
// 1. GENERAR PLANTILLA EXCEL DE PACKS (.XLSX)
// -----------------------------------------------------------------------------

export async function generarPlantillaExcelPacksAction(): Promise<{
  success: boolean;
  dataBase64?: string;
  filename?: string;
  error?: string;
}> {
  try {
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

    const workbook = XLSX.utils.book_new();

    // Hoja 1: Packs con filas de ejemplo
    // Los precios ya NO se cargan manualmente: el precio base se calcula sumando los productos que incluye el pack.
    // Solo se indican los porcentajes de descuento: descuentoConDistribuidor y descuentoSinDistribuidor.
    const headers = [
      'codigo',
      'nombre',
      'etiqueta',
      'descripcion',
      'productos',
      'descuentoConDistribuidor',
      'descuentoSinDistribuidor',
      'activo',
      'destacado',
      'ordenVisualizacion',
      'imagen_url',
    ];

    const ejemploRow1 = [
      'PACK-SALON-01',
      'Pack Nutrición Total Salón (Argán + Macadamia)',
      'Trabajar Steffen',
      'Combo profesional para lavado y tratamiento en tocador. Incluye 2 Shampoo 1000ml + 1 Máscara Nutritiva 1000g + 1 Sérum 250ml.',
      'SH-ARGAN-1000:2 | MAS-NUTRI-1000:1 | SER-ARGAN-250:1',
      25, // % descuento para clientes con distribuidor asignado
      15, // % descuento para clientes sin distribuidor asignado (venta directa fábrica)
      'SI',
      'SI',
      1,
      'https://ejemplo.com/imagenes/pack-nutricion.jpg',
    ];

    const ejemploRow2 = [
      'PACK-REVENTA-02',
      'Combo Exhibidora Reventa Tocador (6 Sérums + 6 Óleos)',
      'Reventa',
      'Pack retail listo para mostrador. Diseñado para maximizar reventa y ticket promedio en salón.',
      'SER-ARGAN-250:6 | OLEO-NUTRI-60:6',
      20,
      10,
      'SI',
      'NO',
      2,
      '',
    ];

    const ejemploRow3 = [
      'PACK-RUTINA-03',
      'Kit Rutina Reparación Cauterizada',
      'Rutinas de tratamiento',
      'Protocolo capilar de cauterización profunda y sellado cuticular para cabellos con daño extremo o procesos químicos.',
      'SH-ARGAN-1000:1 | MAS-NUTRI-1000:1 | SER-ARGAN-250:1',
      30,
      20,
      'SI',
      'SI',
      3,
      '',
    ];

    const sheetData = [headers, ejemploRow1, ejemploRow2, ejemploRow3];
    const wsPacks = XLSX.utils.aoa_to_sheet(sheetData);

    wsPacks['!cols'] = [
      { wch: 18 }, // codigo
      { wch: 45 }, // nombre
      { wch: 28 }, // etiqueta
      { wch: 55 }, // descripcion
      { wch: 50 }, // productos
      { wch: 26 }, // descuentoConDistribuidor
      { wch: 26 }, // descuentoSinDistribuidor
      { wch: 10 }, // activo
      { wch: 12 }, // destacado
      { wch: 18 }, // ordenVisualizacion
      { wch: 40 }, // imagen_url
    ];

    XLSX.utils.book_append_sheet(workbook, wsPacks, 'Packs');

    // Hoja 2: Etiquetas Permitidas (Referencia)
    const etiquetasData = [
      ['Etiquetas Oficiales de Packs Steffen', 'Propósito y Categoría', 'Descripción'],
      ...ETIQUETAS_PACK.map((etq) => [
        etq,
        ETIQUETAS_PACK_CONFIG[etq]?.subtitulo || 'Etiqueta oficial',
        ETIQUETAS_PACK_CONFIG[etq]?.descripcion || 'Segmentación en catálogo de packs',
      ]),
    ];
    const wsEtiquetas = XLSX.utils.aoa_to_sheet(etiquetasData);
    wsEtiquetas['!cols'] = [{ wch: 28 }, { wch: 35 }, { wch: 60 }];

    XLSX.utils.book_append_sheet(workbook, wsEtiquetas, 'Etiquetas_Permitidas');

    // Hoja 3: Productos Disponibles para Incluir (Referencia de SKU, Nombres y Precios PSS)
    try {
      const productosDB = await prisma.producto.findMany({
        where: { activo: true },
        select: { codigo: true, nombre: true, presentacion: true, categoria: true, precioPss: true, stock: true },
        orderBy: [{ categoria: 'asc' }, { ordenVisualizacion: 'asc' }],
      });

      const prodsData = [
        ['Código SKU', 'Nombre del Producto', 'Presentación', 'Categoría', 'Precio Salón (PSS)', 'Stock'],
        ...productosDB.map((p) => [
          p.codigo || '—',
          p.nombre,
          p.presentacion || '—',
          p.categoria || '—',
          Number(p.precioPss),
          p.stock,
        ]),
      ];
      const wsProds = XLSX.utils.aoa_to_sheet(prodsData);
      wsProds['!cols'] = [{ wch: 18 }, { wch: 40 }, { wch: 18 }, { wch: 25 }, { wch: 20 }, { wch: 10 }];
      XLSX.utils.book_append_sheet(workbook, wsProds, 'Catalogo_Productos');
    } catch {
      // Ignorar si no se puede armar la hoja de productos
    }

    const fileBuffer = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
    const filename = `plantilla_carga_masiva_packs_steffen_${new Date().toISOString().slice(0, 10)}.xlsx`;

    return {
      success: true,
      dataBase64: fileBuffer,
      filename,
    };
  } catch (error: any) {
    console.error('Error al generar plantilla Excel de packs:', error);
    return {
      success: false,
      error: `Error al generar la plantilla: ${error?.message || 'Error desconocido'}`,
    };
  }
}

// -----------------------------------------------------------------------------
// 2. PREVISUALIZAR ARCHIVO EXCEL DE PACKS
// -----------------------------------------------------------------------------

export async function previsualizarCargaMasivaPacksAction(
  formData: FormData
): Promise<PrevisualizacionPacksResultado> {
  try {
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

    const excelFile = (formData.get('excel') || formData.get('archivo') || formData.get('file')) as File | null;
    if (!excelFile || !(excelFile instanceof File) || excelFile.size === 0) {
      return { success: false, error: 'Debes seleccionar un archivo Excel válido (.xlsx o .xls).' };
    }

    const buffer = Buffer.from(await excelFile.arrayBuffer());
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(buffer, { type: 'buffer' });
    } catch {
      return { success: false, error: 'No se pudo leer el archivo Excel. Verifica el formato.' };
    }

    const nombreHoja =
      workbook.SheetNames.find((s) => s.toLowerCase().includes('pack')) || workbook.SheetNames[0];

    if (!nombreHoja) {
      return { success: false, error: 'El archivo Excel no contiene hojas de datos.' };
    }

    const worksheet = workbook.Sheets[nombreHoja];
    const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    if (!rawRows || rawRows.length === 0) {
      return { success: false, error: 'La hoja de Packs no contiene filas con datos.' };
    }

    // Consultar packs existentes en DB para identificar CREAR vs ACTUALIZAR
    const packsExistentes = (await (prisma.pack as any).findMany({
      select: { id: true, codigo: true, nombre: true },
    })) as Array<{ id: string; codigo?: string | null; nombre?: string | null }>;

    const codigosExistentesMap = new Map<string, string>();
    const nombresExistentesMap = new Map<string, string>();
    for (const p of packsExistentes) {
      if (p.codigo) codigosExistentesMap.set(p.codigo.trim().toUpperCase(), p.id);
      if (p.nombre) nombresExistentesMap.set(p.nombre.trim().toUpperCase(), p.id);
    }

    // Consultar catálogo de productos para validar columna 'productos' y calcular el precio base automáticamente
    const productosExistentes = await prisma.producto.findMany({
      select: { id: true, codigo: true, nombre: true, precioPss: true },
    });
    const prodsByCodigo = new Map<string, { id: string; precioPss: number }>();
    const prodsByNombre = new Map<string, { id: string; precioPss: number }>();
    for (const prod of productosExistentes) {
      const pss = Number(prod.precioPss) || 0;
      if (prod.codigo) prodsByCodigo.set(prod.codigo.trim().toUpperCase(), { id: prod.id, precioPss: pss });
      if (prod.nombre) prodsByNombre.set(prod.nombre.trim().toUpperCase(), { id: prod.id, precioPss: pss });
    }

    const filasValidadas: FilaPackValidada[] = [];
    let countCrear = 0;
    let countActualizar = 0;
    let countError = 0;

    for (let index = 0; index < rawRows.length; index++) {
      const raw = rawRows[index];
      const numeroFila = index + 2; // Fila 1 es header
      const errores: string[] = [];

      const rawNormalized: Record<string, any> = {};
      for (const [key, value] of Object.entries(raw)) {
        rawNormalized[key.toLowerCase().trim().replace(/[\s_%-]+/g, '')] = value;
      }

      // Código (SKU)
      const codigoRaw = String(
        rawNormalized['codigo'] ?? rawNormalized['sku'] ?? rawNormalized['cod'] ?? ''
      ).trim();
      const codigo = codigoRaw || `PACK-${Date.now().toString().slice(-4)}-${index + 1}`;

      // Nombre
      const nombre = String(rawNormalized['nombre'] ?? rawNormalized['nombrepack'] ?? '').trim();
      if (!nombre) {
        errores.push('El campo "nombre" del pack es obligatorio.');
      }

      // Etiqueta (permite opciones predefinidas, múltiples separadas por / o |, o personalizadas)
      const etiquetaRaw = String(
        rawNormalized['etiqueta'] ??
          rawNormalized['tag'] ??
          rawNormalized['categoria'] ??
          rawNormalized['tipo'] ??
          ''
      ).trim();
      let etiqueta = etiquetaRaw || 'Trabajar Steffen';
      if (
        etiqueta.toLowerCase().includes('vender') ||
        etiqueta.toLowerCase() === 'reventa'
      ) {
        etiqueta = 'Reventa';
      } else if (
        etiqueta.toLowerCase().includes('rutina') ||
        etiqueta.toLowerCase().includes('necesidad')
      ) {
        etiqueta = 'Rutinas de tratamiento';
      }

      // Descripción
      const descripcion = String(rawNormalized['descripcion'] ?? '').trim();
      if (!descripcion) {
        errores.push('El campo "descripcion" es obligatorio.');
      }

      // Productos componentes y cálculo automático del precio base
      const productosRaw = String(
        rawNormalized['productos'] ??
          rawNormalized['items'] ??
          rawNormalized['componentes'] ??
          rawNormalized['incluye'] ??
          rawNormalized['productosdelpack'] ??
          ''
      ).trim();

      let precioBaseCalculado = 0;
      let itemsValidadosCount = 0;

      if (!productosRaw) {
        errores.push('El pack debe incluir al menos un producto en la columna "productos" para calcular automáticamente el precio base.');
      } else {
        const parsedItems = parsearProductosPack(productosRaw);
        if (parsedItems.length === 0) {
          errores.push('No se pudieron interpretar los productos del pack. Usá el formato: SKU:Cantidad | SKU:Cantidad (ej: SH-ARGAN-1000:2 | MAS-NUTRI-1000:1).');
        } else {
          for (const item of parsedItems) {
            const key = item.identificador.toUpperCase();
            let prodInfo = prodsByCodigo.get(key) || prodsByNombre.get(key);
            if (!prodInfo) {
              // Búsqueda por coincidencia parcial si no se encontró exacto
              const matchParcial = productosExistentes.find(
                (p) =>
                  p.nombre.toLowerCase().includes(item.identificador.toLowerCase()) ||
                  (p.codigo && p.codigo.toLowerCase().includes(item.identificador.toLowerCase()))
              );
              if (matchParcial) {
                prodInfo = { id: matchParcial.id, precioPss: Number(matchParcial.precioPss) || 0 };
              }
            }

            if (prodInfo) {
              itemsValidadosCount++;
              precioBaseCalculado += prodInfo.precioPss * item.cantidad;
            } else {
              errores.push(
                `Producto no encontrado en catálogo: "${item.identificador}". Verificá el SKU o Nombre exacto para calcular su precio base.`
              );
            }
          }
        }
      }

      if (precioBaseCalculado <= 0 && errores.length === 0) {
        errores.push('El precio base calculado a partir de los productos incluidos debe ser mayor a $0.');
      }

      // Porcentajes de Descuento (uno por columna)
      // 1. Clientes con distribuidor asignado
      const descDistVal =
        rawNormalized['descuentocondistribuidor'] ??
        rawNormalized['descuentodistribuidor'] ??
        rawNormalized['porcentajecondistribuidor'] ??
        rawNormalized['porcentajedistribuidor'] ??
        rawNormalized['condistribuidor'] ??
        rawNormalized['distribuidor'] ??
        rawNormalized['descuentocon'] ??
        '';

      // 2. Clientes sin distribuidor asignado (venta directa fábrica)
      const descDirectoVal =
        rawNormalized['descuentosindistribuidor'] ??
        rawNormalized['descuentodirecto'] ??
        rawNormalized['porcentajesindistribuidor'] ??
        rawNormalized['porcentajedirecto'] ??
        rawNormalized['sindistribuidor'] ??
        rawNormalized['directo'] ??
        rawNormalized['descuentosin'] ??
        '';

      const descDistNum = descDistVal !== '' ? Number(descDistVal) : 0;
      const descDirectoNum = descDirectoVal !== '' ? Number(descDirectoVal) : 0;

      if (isNaN(descDistNum) || descDistNum < 0 || descDistNum > 100) {
        errores.push('El porcentaje en "descuentoConDistribuidor" debe ser un número entre 0 y 100 (ej: 25 para 25% OFF).');
      }
      if (isNaN(descDirectoNum) || descDirectoNum < 0 || descDirectoNum > 100) {
        errores.push('El porcentaje en "descuentoSinDistribuidor" debe ser un número entre 0 y 100 (ej: 15 para 15% OFF).');
      }

      const precioBase = Math.round(precioBaseCalculado);
      const factorDist = 1 - (isNaN(descDistNum) ? 0 : descDistNum) / 100;
      const factorDirecto = 1 - (isNaN(descDirectoNum) ? 0 : descDirectoNum) / 100;
      const precioDistribuidorCalculado = Math.round(precioBase * factorDist);
      const precioDirectoCalculado = Math.round(precioBase * factorDirecto);

      // Flags
      const activo = parsearBooleano(rawNormalized['activo'], true);
      const destacado = parsearBooleano(rawNormalized['destacado'], false);

      // Orden de visualización
      const ordenRaw = Number(rawNormalized['ordenvisualizacion'] ?? rawNormalized['orden'] ?? 0);
      const ordenVisualizacion =
        !isNaN(ordenRaw) && Number.isInteger(ordenRaw) ? Math.max(0, Math.floor(ordenRaw)) : 0;

      // Imagen URL
      const imagenUrlRaw = String(
        rawNormalized['imagen_url'] ?? rawNormalized['imagenurl'] ?? rawNormalized['imagen'] ?? ''
      ).trim();
      const imagen_url = imagenUrlRaw || null;

      if (imagen_url) {
        const urlCheck = esUrlSeguraParaDescarga(imagen_url);
        if (!urlCheck.segura) {
          errores.push(`URL de imagen no permitida: ${urlCheck.error}`);
        }
      }

      // Determinar acción
      const existePorCodigo = codigo ? codigosExistentesMap.has(codigo.toUpperCase()) : false;
      const existePorNombre = nombre ? nombresExistentesMap.has(nombre.toUpperCase()) : false;
      const accion: 'CREAR' | 'ACTUALIZAR' = existePorCodigo || existePorNombre ? 'ACTUALIZAR' : 'CREAR';

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
          etiqueta,
          descripcion,
          productos: productosRaw,
          descuentoConDistribuidor: isNaN(descDistNum) ? 0 : descDistNum,
          descuentoSinDistribuidor: isNaN(descDirectoNum) ? 0 : descDirectoNum,
          precioBaseCalculado: precioBase,
          precioDistribuidorCalculado,
          precioDirectoCalculado,
          activo,
          destacado,
          ordenVisualizacion,
          imagen_url,
          itemsValidadosCount,
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
  } catch (error: any) {
    console.error('Error al previsualizar carga masiva de packs:', error);
    return {
      success: false,
      error: `Error al procesar el archivo: ${error?.message || 'Error desconocido'}`,
    };
  }
}

// -----------------------------------------------------------------------------
// 3. CONFIRMAR Y EJECUTAR CARGA MASIVA DE PACKS
// -----------------------------------------------------------------------------

export async function confirmarCargaMasivaPacksAction(
  filasAProcesar: (FilaPackValidada | FilaExcelPackDatos)[]
): Promise<ResumenCargaMasivaPacks> {
  try {
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

    if (!filasAProcesar || filasAProcesar.length === 0) {
      return {
        success: false,
        creados: 0,
        actualizados: 0,
        omitidos: 0,
        totalProcesados: 0,
        advertencias: [],
        error: 'No hay filas para procesar.',
      };
    }

    // Traer todos los productos para resolver componentes y calcular precio base
    const productosExistentes = await prisma.producto.findMany({
      select: { id: true, codigo: true, nombre: true, precioPss: true },
    });
    const prodsByCodigo = new Map<string, { id: string; precioPss: number }>();
    const prodsByNombre = new Map<string, { id: string; precioPss: number }>();
    for (const prod of productosExistentes) {
      const pss = Number(prod.precioPss) || 0;
      if (prod.codigo) prodsByCodigo.set(prod.codigo.trim().toUpperCase(), { id: prod.id, precioPss: pss });
      if (prod.nombre) prodsByNombre.set(prod.nombre.trim().toUpperCase(), { id: prod.id, precioPss: pss });
    }

    let creados = 0;
    let actualizados = 0;
    let omitidos = 0;
    const advertencias: AdvertenciaCargaPack[] = [];

    for (let i = 0; i < filasAProcesar.length; i++) {
      const item = filasAProcesar[i];
      const datos: FilaExcelPackDatos = 'datos' in item ? item.datos : item;
      const numeroFila = 'numeroFila' in item ? item.numeroFila : i + 2;

      const codigo = datos.codigo?.trim() || null;
      const nombre = datos.nombre?.trim();
      const descripcion = datos.descripcion?.trim();
      const productosRaw = datos.productos?.trim() || '';

      const descuentoConDistribuidor = Number(datos.descuentoConDistribuidor ?? 0);
      const descuentoSinDistribuidor = Number(datos.descuentoSinDistribuidor ?? 0);

      // Calcular o verificar precio base a partir de los productos incluidos
      let precioBase = Number(datos.precioBaseCalculado ?? 0);
      const parsedItems = productosRaw ? parsearProductosPack(productosRaw) : [];

      if ((isNaN(precioBase) || precioBase <= 0) && parsedItems.length > 0) {
        let suma = 0;
        for (const it of parsedItems) {
          const key = it.identificador.toUpperCase();
          let prodInfo = prodsByCodigo.get(key) || prodsByNombre.get(key);
          if (!prodInfo) {
            const match = productosExistentes.find(
              (p) =>
                p.nombre.toLowerCase().includes(it.identificador.toLowerCase()) ||
                (p.codigo && p.codigo.toLowerCase().includes(it.identificador.toLowerCase()))
            );
            if (match) {
              prodInfo = { id: match.id, precioPss: Number(match.precioPss) || 0 };
            }
          }
          if (prodInfo) {
            suma += prodInfo.precioPss * it.cantidad;
          }
        }
        if (suma > 0) {
          precioBase = Math.round(suma);
        }
      }

      if (!nombre || !descripcion || isNaN(precioBase) || precioBase <= 0) {
        omitidos++;
        advertencias.push({
          fila: numeroFila,
          codigo: codigo || 'N/A',
          mensaje: 'Fila omitida por datos incompletos o precio base no calculable ($0). Debe contener productos válidos.',
        });
        continue;
      }

      // Cálculo de precios finales según los porcentajes de descuento por columna
      const factorDist = 1 - (isNaN(descuentoConDistribuidor) ? 0 : descuentoConDistribuidor) / 100;
      const factorDirecto = 1 - (isNaN(descuentoSinDistribuidor) ? 0 : descuentoSinDistribuidor) / 100;
      const precioDistribuidor = Math.round(precioBase * factorDist);
      const precioDirecto = Math.round(precioBase * factorDirecto);
      const precioPromocional = precioDirecto > 0 ? precioDirecto : (precioDistribuidor > 0 ? precioDistribuidor : precioBase);
      const maxDescuento = Math.max(descuentoConDistribuidor, descuentoSinDistribuidor);

      // Buscar pack existente por código o por nombre
      let existente: any = null;
      if (codigo) {
        existente = await prisma.pack.findUnique({
          where: { codigo } as any,
        });
      }
      if (!existente && nombre) {
        existente = await prisma.pack.findFirst({
          where: { nombre: { equals: nombre, mode: 'insensitive' } },
        });
      }

      // Procesar Imagen
      let urlImagenFinal: string | null = null;
      const imagenRef = datos.imagen_url?.trim() || '';

      if (imagenRef) {
        if (imagenRef.startsWith('http://') || imagenRef.startsWith('https://')) {
          const resDescarga = await descargarYValidarImagenSegura(imagenRef);
          if (resDescarga.buffer && resDescarga.mimeType) {
            const resSubida = await almacenarBufferImagenProducto(
              resDescarga.buffer,
              resDescarga.mimeType
            );
            if (resSubida.success && resSubida.url) {
              urlImagenFinal = resSubida.url;
            } else {
              advertencias.push({
                fila: numeroFila,
                codigo: codigo || nombre,
                mensaje: `No se pudo almacenar la imagen descargada: ${resSubida.error || 'Error'}`,
              });
            }
          } else {
            advertencias.push({
              fila: numeroFila,
              codigo: codigo || nombre,
              mensaje: `No se pudo descargar la imagen desde la URL: ${resDescarga.error || 'Error de red'}`,
            });
          }
        } else if (imagenRef.startsWith('/') || imagenRef.includes('supabase.co')) {
          urlImagenFinal = imagenRef;
        }
      }

      const etiqueta = datos.etiqueta?.trim() || 'Trabajar Steffen';
      const activo = Boolean(datos.activo);
      const destacado = Boolean(datos.destacado);
      const ordenVisualizacion = Number.isInteger(Number(datos.ordenVisualizacion))
        ? Math.max(0, Number(datos.ordenVisualizacion))
        : 0;

      let packId = '';

      if (existente) {
        // ACTUALIZAR PACK
        const updated = await (prisma.pack as any).update({
          where: { id: existente.id },
          data: {
            codigo,
            nombre,
            etiqueta,
            descripcion,
            precioOriginal: new Prisma.Decimal(precioBase),
            precioPssEquivalente: new Prisma.Decimal(precioBase),
            precioDistribuidor: new Prisma.Decimal(precioDistribuidor),
            precioDirecto: new Prisma.Decimal(precioDirecto),
            precioPromocional: new Prisma.Decimal(precioPromocional),
            descuento: new Prisma.Decimal(maxDescuento),
            descuentoDistribuidor: new Prisma.Decimal(descuentoConDistribuidor),
            descuentoDirecto: new Prisma.Decimal(descuentoSinDistribuidor),
            activo,
            destacado,
            ordenVisualizacion,
            ...(urlImagenFinal ? { imagen: urlImagenFinal } : {}),
          },
        });
        packId = updated.id;
        actualizados++;
      } else {
        // CREAR PACK
        const imagenParaCrear = urlImagenFinal || '/loguito.png';

        const created = await (prisma.pack as any).create({
          data: {
            codigo,
            nombre,
            etiqueta,
            descripcion,
            precioOriginal: new Prisma.Decimal(precioBase),
            precioPssEquivalente: new Prisma.Decimal(precioBase),
            precioDistribuidor: new Prisma.Decimal(precioDistribuidor),
            precioDirecto: new Prisma.Decimal(precioDirecto),
            precioPromocional: new Prisma.Decimal(precioPromocional),
            descuento: new Prisma.Decimal(maxDescuento),
            descuentoDistribuidor: new Prisma.Decimal(descuentoConDistribuidor),
            descuentoDirecto: new Prisma.Decimal(descuentoSinDistribuidor),
            imagen: imagenParaCrear,
            activo,
            destacado,
            ordenVisualizacion,
          },
        });
        packId = created.id;
        creados++;
      }

      // Procesar productos / componentes del pack
      if (parsedItems.length > 0 && packId) {
        // Eliminar PackItems existentes para refrescar con la lista del Excel
        await prisma.packItem.deleteMany({
          where: { packId },
        });

        for (const item of parsedItems) {
          const key = item.identificador.toUpperCase();
          let prodInfo = prodsByCodigo.get(key) || prodsByNombre.get(key);

          // Búsqueda por coincidencia parcial si no se encontró exacto
          if (!prodInfo) {
            const match = productosExistentes.find(
              (p) =>
                p.nombre.toLowerCase().includes(item.identificador.toLowerCase()) ||
                (p.codigo && p.codigo.toLowerCase().includes(item.identificador.toLowerCase()))
            );
            if (match) {
              prodInfo = { id: match.id, precioPss: Number(match.precioPss) || 0 };
            }
          }

          if (prodInfo) {
            try {
              await prisma.packItem.create({
                data: {
                  packId,
                  productoId: prodInfo.id,
                  cantidad: item.cantidad,
                },
              });
            } catch (itemErr: any) {
              console.error(`Error al asociar item al pack ${packId}:`, itemErr);
            }
          } else {
            advertencias.push({
              fila: numeroFila,
              codigo: codigo || nombre,
              mensaje: `No se pudo encontrar en el catálogo el producto "${item.identificador}" para asociarlo al pack.`,
            });
          }
        }
      }
    }

    // Revalidar rutas
    revalidatePath('/admin');
    revalidatePath('/admin/packs');
    revalidatePath('/packs');
    revalidatePath('/catalogo');
    revalidatePath('/catalogo/packs/[id]', 'page');
    revalidatePath('/carrito');

    return {
      success: true,
      creados,
      actualizados,
      omitidos,
      totalProcesados: creados + actualizados,
      advertencias,
    };
  } catch (error: any) {
    console.error('Error al confirmar carga masiva de packs:', error);
    return {
      success: false,
      creados: 0,
      actualizados: 0,
      omitidos: 0,
      totalProcesados: 0,
      advertencias: [],
      error: `Error al guardar los packs: ${error?.message || 'Error desconocido'}`,
    };
  }
}
