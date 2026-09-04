import { PackDTO, PackItemDTO } from '@/components/catalogo/PackCard';

export interface DetalleItemReventa {
  productoId: string;
  nombre: string;
  presentacion: string;
  cantidad: number;
  precioEcommerceUnitario: number;
  subtotalEcommerce: number;
  esExhibidora?: boolean;
  unidadesPorCaja?: number | null;
}

export interface PotencialReventaResultado {
  esPackReventa: boolean;
  facturacionPotencial: number;
  inversion: number;
  gananciaPotencial: number;
  porcentajeGanancia: number; // Retorno sobre la inversión (ROI): (ganancia / inversion) * 100
  margenSobreVenta: number;   // Margen sobre la facturación: (ganancia / facturacion) * 100
  items: DetalleItemReventa[];
}

/**
 * Detecta si un producto corresponde a una caja exhibidora y devuelve
 * la cantidad de unidades individuales que contiene para la reventa en salón:
 * - Emulsión Triple Acción -> 12 unidades
 * - Máscara Capilar -> 36 unidades
 */
export function obtenerUnidadesExhibidora(
  nombre: string | null | undefined,
  presentacion?: string | null | undefined
): number | null {
  const texto = `${nombre || ''} ${presentacion || ''}`.toLowerCase();
  const esExhibidora = texto.includes('exhibidora') || texto.includes('caja exhibidora');

  if (!esExhibidora) {
    return null;
  }

  // 1. Emulsión Triple Acción (12 unidades)
  if (
    texto.includes('triple acci') ||
    texto.includes('emulsion') ||
    texto.includes('emulsión') ||
    texto.includes('12u') ||
    texto.includes('12 u')
  ) {
    return 12;
  }

  // 2. Máscara Capilar (36 unidades)
  if (
    texto.includes('mascara') ||
    texto.includes('máscara') ||
    texto.includes('36u') ||
    texto.includes('36 u')
  ) {
    return 36;
  }

  // Patrón genérico por si existe otra presentación con unidades explícitas
  const match = texto.match(/(\d+)\s*u(?:nid)?\b/);
  if (match) {
    const parsed = parseInt(match[1], 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }

  return null;
}

/**
 * Limpia el texto de la descripción del pack, separando el párrafo descriptivo,
 * removiendo el texto estático antiguo de "POTENCIAL DE REVENTA SUGERIDO"
 * y aislando "BENEFICIOS EXCLUSIVOS INCLUIDOS" para mostrarlo de forma destacada.
 */
export function limpiarDescripcionPack(texto: string | null | undefined): {
  descripcionLimpia: string;
  beneficiosExclusivos: string | null;
} {
  if (!texto) {
    return { descripcionLimpia: '', beneficiosExclusivos: null };
  }

  let beneficiosExclusivos: string | null = null;
  const matchBeneficios = texto.match(/BENEFICIOS EXCLUSIVOS INCLUIDOS:\s*([\s\S]+?)$/i);
  if (matchBeneficios) {
    beneficiosExclusivos = matchBeneficios[1].trim();
  }

  // Quitar cualquier bloque estático previo de "POTENCIAL DE REVENTA SUGERIDO"
  let limpia = texto.replace(/POTENCIAL DE REVENTA SUGERIDO[\s\S]*?(?=BENEFICIOS EXCLUSIVOS INCLUIDOS:|$)/i, '');

  // Quitar la sección de beneficios del texto principal para no duplicar
  if (matchBeneficios) {
    limpia = limpia.replace(/BENEFICIOS EXCLUSIVOS INCLUIDOS:[\s\S]*$/i, '');
  }

  limpia = limpia.trim();

  return {
    descripcionLimpia: limpia,
    beneficiosExclusivos,
  };
}

/**
 * Calcula automáticamente la proyección económica de reventa para un pack:
 * 1. Facturación potencial con precio sugerido = Sumatoria de (cantidad * precioSugeridoVentaSalon) de cada producto.
 * 2. Inversión en el pack = Precio final con el descuento que se le aplica al salón (pack.precioPromocional).
 * 3. Ganancia potencial estimada = Facturación potencial - Inversión en el pack.
 */
export function calcularPotencialReventa(pack: {
  items?: PackItemDTO[];
  precioPromocional: number;
  etiqueta?: string | null;
  nombre?: string;
  descripcion?: string;
}): PotencialReventaResultado {
  const etiquetaStr = (pack.etiqueta || '').toLowerCase();
  const nombreStr = (pack.nombre || '').toLowerCase();
  const descStr = (pack.descripcion || '').toLowerCase();

  const tieneEtiquetaReventa =
    etiquetaStr.includes('reventa') ||
    nombreStr.includes('reventa') ||
    descStr.includes('potencial de reventa') ||
    descStr.includes('vender más en mi salón');

  const itemsDetalle: DetalleItemReventa[] = [];
  let facturacionTotal = 0;

  for (const it of pack.items || []) {
    // Prioridad para el precio de reventa sugerido:
    // 1. precioReventa específico del producto (cargado para packs de reventa)
    // 2. precioEcommerce (precio público de referencia)
    // 3. precioUnitario * 1.45 como margen estimado de respaldo
    let pSugerido = 0;
    if (it.precioReventa !== undefined && it.precioReventa !== null && it.precioReventa > 0) {
      pSugerido = it.precioReventa;
    } else if (it.precioEcommerce !== undefined && it.precioEcommerce !== null && it.precioEcommerce > 0) {
      pSugerido = it.precioEcommerce;
    } else if (it.precioUnitario && it.precioUnitario > 0) {
      pSugerido = Math.round(it.precioUnitario * 1.45);
    }

    const subtotalItem = pSugerido * it.cantidad;
    facturacionTotal += subtotalItem;

    const unidadesCaja = obtenerUnidadesExhibidora(it.nombre, it.presentacion);
    const esExhibidora = unidadesCaja !== null && unidadesCaja > 1;

    // En las cajas exhibidoras, el precio unitario sugerido al público se divide
    // por la cantidad de unidades que tiene la caja para reflejar el valor individual
    // de reventa en el salón (ej: 36 unidades para Máscaras, 12 para Triple Acción).
    const precioUnitarioSugerido = esExhibidora && unidadesCaja
      ? Math.round((pSugerido / unidadesCaja) * 100) / 100
      : pSugerido;

    itemsDetalle.push({
      productoId: it.productoId,
      nombre: it.nombre,
      presentacion: it.presentacion,
      cantidad: it.cantidad,
      precioEcommerceUnitario: precioUnitarioSugerido,
      subtotalEcommerce: subtotalItem,
      esExhibidora,
      unidadesPorCaja: unidadesCaja,
    });
  }

  const inversion = pack.precioPromocional > 0 ? pack.precioPromocional : 0;
  const gananciaPotencial = Math.max(0, facturacionTotal - inversion);

  const porcentajeGanancia =
    inversion > 0 ? Math.round((gananciaPotencial / inversion) * 100) : 0;

  const margenSobreVenta =
    facturacionTotal > 0 ? Math.round((gananciaPotencial / facturacionTotal) * 100) : 0;

  const esPackReventa = tieneEtiquetaReventa && facturacionTotal > 0 && inversion > 0;

  return {
    esPackReventa,
    facturacionPotencial: facturacionTotal,
    inversion,
    gananciaPotencial,
    porcentajeGanancia,
    margenSobreVenta,
    items: itemsDetalle,
  };
}
