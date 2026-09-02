import { EstadoCliente } from '@prisma/client';

export type TipoPrecioVisible = 'PUBLICO' | 'PROFESIONAL';

export interface DeterminacionPrecioResultado {
  precio: number;
  tipoPrecio: TipoPrecioVisible;
}

export interface ClientePrecioInput {
  estadoCliente?: EstadoCliente | string | null;
}

export interface ProductoPrecioInput {
  precioPss: number | string | { toNumber?: () => number } | any;
  precioEcommerce?: number | string | { toNumber?: () => number } | any;
}

/**
 * Determina el precio visible y su tipología para un producto según el estado del cliente.
 * 
 * Reglas de Negocio:
 * - Si cliente es null/undefined (visitante no autenticado) → PUBLICO (precioEcommerce).
 * - Si cliente.estadoCliente === 'ACTIVO' → PROFESIONAL (precioPss).
 * - Cualquier otro estado (PENDIENTE_APROBACION, INACTIVO) → PUBLICO (precioEcommerce).
 * - Si cliente.estadoCliente === 'BLOQUEADO', el middleware/controlador debe bloquearlo antes,
 *   pero por seguridad por defecto retorna PUBLICO.
 */
export function determinarPrecioVisible(
  cliente: ClientePrecioInput | null | undefined,
  producto: ProductoPrecioInput
): DeterminacionPrecioResultado {
  const pss = typeof producto.precioPss === 'object' && producto.precioPss?.toNumber
    ? producto.precioPss.toNumber()
    : Number(producto.precioPss) || 0;

  const ecommerce = typeof producto.precioEcommerce === 'object' && producto.precioEcommerce?.toNumber
    ? producto.precioEcommerce.toNumber()
    : Number(producto.precioEcommerce) || (pss > 0 ? pss : 0);

  // Si el cliente está logueado y ACTIVO, accede al Precio Sugerido Salón (Profesional)
  if (cliente && (cliente.estadoCliente === EstadoCliente.ACTIVO || (cliente.estadoCliente as string) === 'ACTIVO')) {
    return {
      precio: pss,
      tipoPrecio: 'PROFESIONAL',
    };
  }

  // Visitantes no autenticados o usuarios en PENDIENTE_APROBACION / INACTIVO
  return {
    precio: ecommerce > 0 ? ecommerce : pss,
    tipoPrecio: 'PUBLICO',
  };
}
