'use server';

import { prisma } from '@/lib/prisma';
import { obtenerSesionCliente } from '@/lib/services/session';
import { CalculoDescuentoResultado } from '@/lib/services/descuentos';
import { TipoItemCarrito } from '@/lib/types/carrito';
import { VarianteProducto } from '@/lib/utils/variantes';
import { liquidarCarrito } from '@/lib/services/liquidacion';

export type { CalculoDescuentoResultado };

export interface ItemCarritoServerResponse {
  id: string;
  tipo: TipoItemCarrito;
  productoId?: string;
  packId?: string;
  variante?: string | null;
  variantesDisponibles?: VarianteProducto[];
  cantidad: number;
  nombre: string;
  categoria: string;
  presentacion: string;
  imagen: string;
  precioUnitarioPss: number; // Precio unitario visible calculado
  tipoPrecio: 'PUBLICO' | 'PROFESIONAL';
  precioProfesionalBloqueado?: number | null;
  subtotal: number;
  disponible: boolean;
  motivoNoDisponible?: string;
  productosIncluidos?: Array<{ nombre: string; cantidad: number }>;
  tieneDistribuidor?: boolean;
  nombreDistribuidor?: string | null;
  precioOriginalTachado?: number | null;
  porcentajeAhorroPack?: number | null;
  tipoPrecioPack?: 'DISTRIBUIDOR' | 'DIRECTO' | 'PROMOCIONAL';
}

export interface ObtenerCarritoResultado {
  itemsValidos: ItemCarritoServerResponse[];
  itemsRemovidosIds: Array<{ id: string; tipo: TipoItemCarrito; variante?: string | null; motivo?: string }>;
  subtotalPss: number;
  tipoPrecio: 'PUBLICO' | 'PROFESIONAL';
  descuento: CalculoDescuentoResultado;
  mensajesAviso?: string[];
  tieneDistribuidor?: boolean;
  nombreDistribuidor?: string | null;
  subtotalProductos?: number;
  subtotalPacks?: number;
  esSinDistribuidor?: boolean;
}

/**
 * Server Action que recibe los IDs, tipos, variantes y cantidades del CartContext (localStorage)
 * y delega en el motor central de liquidación de Steffen (liquidarCarrito).
 */
export async function obtenerProductosDelCarritoAction(
  itemsCliente: Array<{ id: string; tipo: TipoItemCarrito; cantidad: number; variante?: string | null }>
): Promise<ObtenerCarritoResultado> {
  // 1. Obtener la sesión del cliente en el servidor
  const sesion = await obtenerSesionCliente();
  const cliente = sesion?.cliente || null;

  // 2. Liquidar el carrito mediante el motor comercial central
  const resultado = await liquidarCarrito(itemsCliente, cliente, { modo: 'CARRITO' });

  // 3. Devolver la estructura que espera el frontend (CarritoClient)
  return {
    itemsValidos: resultado.itemsValidos.map((it) => ({
      id: it.id,
      tipo: it.tipo,
      productoId: it.productoId,
      packId: it.packId,
      variante: it.variante,
      variantesDisponibles: it.variantesDisponibles,
      cantidad: it.cantidad,
      nombre: it.nombre,
      categoria: it.categoria,
      presentacion: it.presentacion,
      imagen: it.imagen,
      precioUnitarioPss: it.precioUnitario,
      tipoPrecio: it.tipoPrecio,
      precioProfesionalBloqueado: it.precioProfesionalBloqueado,
      subtotal: it.subtotal,
      disponible: it.disponible,
      motivoNoDisponible: it.motivoNoDisponible,
      productosIncluidos: it.productosIncluidos,
      tieneDistribuidor: resultado.tieneDistribuidor,
      nombreDistribuidor: resultado.nombreDistribuidor,
      precioOriginalTachado: it.precioOriginalTachado,
      porcentajeAhorroPack: it.porcentajeAhorroPack,
      tipoPrecioPack: it.tipoPrecioPack,
    })),
    itemsRemovidosIds: resultado.itemsRemovidosIds,
    subtotalPss: resultado.subtotalGeneral,
    tipoPrecio: resultado.tipoPrecio,
    descuento: resultado.descuento,
    mensajesAviso: resultado.mensajesAviso,
    tieneDistribuidor: resultado.tieneDistribuidor,
    nombreDistribuidor: resultado.nombreDistribuidor,
    subtotalProductos: resultado.subtotalProductos,
    subtotalPacks: resultado.subtotalPacks,
    esSinDistribuidor: resultado.esSinDistribuidor,
  };
}
