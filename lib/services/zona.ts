import { EstadoZona } from '@prisma/client';

export type EstadoZonaType = 'SIN_DISTRIBUIDOR' | 'COBERTURA_PARCIAL' | 'CON_DISTRIBUIDOR';

export interface EvaluacionZonaResult {
  estado: EstadoZonaType;
  permiteCompraDirectaFabrica: boolean;
  requiereContactoDistribuidor: boolean;
  mensajeInformativo: string;
}

export interface ClienteZonaLike {
  zona?: {
    id?: string | null;
    estado?: EstadoZona | string | null;
    distribuidorId?: string | null;
    distribuidor?: {
      id?: string | null;
      estado?: string | null;
      nombre?: string | null;
      empresa?: string | null;
      whatsapp?: string | null;
    } | null;
  } | null;
}

/**
 * Determina de forma centralizada si un cliente cuenta con un distribuidor oficial activo asignado a su zona.
 * 
 * Reglas Comerciales:
 * - Requiere que el cliente tenga una zona configurada.
 * - La zona debe estar en estado 'CON_DISTRIBUIDOR' y contar con un distribuidor asignado.
 * - Si el objeto distribuidor está precargado, su estado debe ser estrictamente 'ACTIVO'.
 * - Zonas sin distribuidor, zonas sin cobertura, o zonas con distribuidor inactivo se consideran venta directa de fábrica.
 */
export function tieneDistribuidorActivo(
  cliente: ClienteZonaLike | null | undefined
): boolean {
  if (!cliente || !cliente.zona) {
    return false;
  }

  const { zona } = cliente;

  // Si la zona fue marcada explícitamente como SIN_DISTRIBUIDOR, es venta directa
  if (zona.estado === 'SIN_DISTRIBUIDOR' || zona.estado === EstadoZona.SIN_DISTRIBUIDOR) {
    return false;
  }

  // Si tiene el objeto distribuidor cargado, verificar que su estado sea estrictamente ACTIVO
  if (zona.distribuidor) {
    return zona.distribuidor.estado === 'ACTIVO';
  }

  // Si no tiene el objeto distribuidor expandido pero tiene distribuidorId y estado CON_DISTRIBUIDOR
  return Boolean(
    zona.distribuidorId &&
    (zona.estado === 'CON_DISTRIBUIDOR' || zona.estado === EstadoZona.CON_DISTRIBUIDOR)
  );
}

/**
 * Evalúa las condiciones comerciales y de visualización según la zona geográfica.
 * Regla de negocio Steffen:
 * - Todos los usuarios pueden comprar directamente desde el portal.
 * - La existencia de un distribuidor NO bloquea la compra ni el carrito.
 * - permiteCompraDirectaFabrica es true en todos los casos.
 * - requiereContactoDistribuidor es false (el contacto es opcional).
 * - En zonas con distribuidor se presenta un aviso informativo con opción de contacto comercial.
 */
export function evaluarAccesoZona(estadoZona?: EstadoZonaType | null): EvaluacionZonaResult {
  if (estadoZona === 'CON_DISTRIBUIDOR') {
    return {
      estado: 'CON_DISTRIBUIDOR',
      permiteCompraDirectaFabrica: true,
      requiereContactoDistribuidor: false,
      mensajeInformativo:
        'Tu localidad cuenta con un distribuidor oficial Steffen. Podés coordinar con tu representante o continuar con tu pedido directo por este portal oficial.',
    };
  }

  return {
    estado: estadoZona === 'COBERTURA_PARCIAL' ? 'COBERTURA_PARCIAL' : 'SIN_DISTRIBUIDOR',
    permiteCompraDirectaFabrica: true,
    requiereContactoDistribuidor: false,
    mensajeInformativo:
      '¡Tu salón se encuentra en una zona con atención directa de fábrica Steffen! Accedés a precios profesionales y beneficios exclusivos.',
  };
}
