'use server';

import { prisma } from '@/lib/prisma';
import { obtenerSesionCliente } from '@/lib/services/session';
import { determinarPrecioVisible } from '@/lib/services/precios';
import { calcularDescuentoParaCliente, CalculoDescuentoResultado } from '@/lib/services/descuentos';
import { calcularDisponibilidadPack, evaluarDisponibilidadPack, obtenerPrecioPackParaCliente } from '@/lib/services/packs';
import { TipoItemCarrito } from '@/lib/types/carrito';
import { parsearVariantes, obtenerPreciosEfectivosProducto, VarianteProducto } from '@/lib/utils/variantes';

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
 * 1. Separa consultas entre Productos sueltos y Packs/Combos promocionales.
 * 2. Valida disponibilidad y vigencia de Packs mediante calcularDisponibilidadPack().
 *    Los packs están restringidos a cuentas con estado ACTIVO.
 * 3. Para productos sueltos, aplica determinarPrecioVisible() considerando variantes y precios específicos.
 *    Para packs, utiliza obtenerPrecioPackParaCliente() considerando si la cuenta tiene distribuidor asignado.
 * 4. Suma los subtotales separadamente. El descuento dinámico de la cuenta aplica sobre los productos individuales.
 */
export async function obtenerProductosDelCarritoAction(
  itemsCliente: Array<{ id: string; tipo: TipoItemCarrito; cantidad: number; variante?: string | null }>
): Promise<ObtenerCarritoResultado> {
  if (!itemsCliente || itemsCliente.length === 0) {
    return {
      itemsValidos: [],
      itemsRemovidosIds: [],
      subtotalPss: 0,
      tipoPrecio: 'PUBLICO',
      descuento: {
        tipoAplicado: 'SIN_DESCUENTO',
        porcentaje: 0,
        montoDescuento: 0,
        subtotalPss: 0,
        total: 0,
        reglaId: null,
        etiqueta: 'Sin descuento',
      },
      tieneDistribuidor: false,
      nombreDistribuidor: null,
      subtotalProductos: 0,
      subtotalPacks: 0,
      esSinDistribuidor: false,
    };
  }

  // 1. Obtener la sesión del cliente en el servidor
  const sesion = await obtenerSesionCliente();
  const cliente = sesion?.cliente || null;
  const esClienteActivo = cliente?.estadoCliente === 'ACTIVO';
  const esPendienteAprobacion = !!sesion && cliente?.estadoCliente === 'PENDIENTE_APROBACION';
  const tieneDistribuidor = Boolean(
    cliente?.zona?.distribuidorId && cliente?.zona?.estado !== 'SIN_DISTRIBUIDOR'
  );
  const esSinDistribuidor = Boolean(
    sesion && cliente && (!cliente?.zona?.distribuidorId || cliente?.zona?.estado === 'SIN_DISTRIBUIDOR')
  );
  const nombreDistribuidor = cliente?.zona?.distribuidor?.nombre || null;

  // 2. Separar IDs por tipo
  const productosItems = itemsCliente.filter((i) => i.tipo === 'PRODUCTO');
  const packsItems = itemsCliente.filter((i) => i.tipo === 'PACK');

  const productosIds = Array.from(new Set(productosItems.map((i) => i.id)));
  const packsIds = Array.from(new Set(packsItems.map((i) => i.id)));

  // 3. Consultar productos en DB
  const productosDB = (productosIds.length > 0
    ? await prisma.producto.findMany({
        where: { id: { in: productosIds } },
      })
    : []) as any[];
  const productosMap = new Map(productosDB.map((p) => [p.id, p]));

  const itemsValidos: ItemCarritoServerResponse[] = [];
  const itemsRemovidosIds: Array<{ id: string; tipo: TipoItemCarrito; variante?: string | null; motivo?: string }> = [];
  const mensajesAviso: string[] = [];
  let subtotalProductos = 0;
  let subtotalPacks = 0;
  const tipoPrecioGeneral: 'PUBLICO' | 'PROFESIONAL' =
    cliente?.estadoCliente === 'ACTIVO' ? 'PROFESIONAL' : 'PUBLICO';

  // 4. Procesar productos sueltos
  for (const item of productosItems) {
    const prod = productosMap.get(item.id);

    if (!prod || !prod.activo) {
      itemsRemovidosIds.push({ id: item.id, tipo: 'PRODUCTO', variante: item.variante, motivo: 'Producto no disponible' });
      continue;
    }

    const variantesDisponibles = parsearVariantes(prod.variantes);
    const { precioPss: precioPssEfectivo, precioEcommerce: precioEcomEfectivo } =
      obtenerPreciosEfectivosProducto(
        {
          precioPss: Number(prod.precioPss),
          precioEcommerce: Number(prod.precioEcommerce),
          variantes: variantesDisponibles,
        },
        item.variante
      );

    const { precio, tipoPrecio } = determinarPrecioVisible(cliente, {
      precioPss: precioPssEfectivo,
      precioEcommerce: precioEcomEfectivo,
    });

    const subtotalItem = precio * item.cantidad;
    subtotalProductos += subtotalItem;

    itemsValidos.push({
      id: prod.id,
      tipo: 'PRODUCTO',
      productoId: prod.id,
      variante: item.variante ? item.variante.trim() : null,
      variantesDisponibles,
      cantidad: item.cantidad,
      nombre: prod.nombre,
      categoria: prod.categoria,
      presentacion: prod.presentacion,
      imagen: prod.imagen,
      precioUnitarioPss: precio,
      tipoPrecio,
      precioProfesionalBloqueado: esPendienteAprobacion ? precioPssEfectivo : null,
      subtotal: subtotalItem,
      disponible: true,
    });
  }

  // 5. Procesar Packs promocionales en una sola consulta por lotes
  const packsDB = packsIds.length > 0
    ? await prisma.pack.findMany({
        where: { id: { in: packsIds } },
        include: {
          items: {
            include: {
              producto: true,
            },
          },
        },
      })
    : [];
  const packsMap = new Map(packsDB.map((p) => [p.id, p]));

  for (const item of packsItems) {
    // Si la cuenta no está activa, los packs no están disponibles
    if (!esClienteActivo) {
      itemsRemovidosIds.push({
        id: item.id,
        tipo: 'PACK',
        motivo: 'Los packs están disponibles solo para cuentas profesionales activas',
      });
      if (!mensajesAviso.includes('Los packs están disponibles solo para cuentas profesionales activas')) {
        mensajesAviso.push('Los packs están disponibles solo para cuentas profesionales activas');
      }
      continue;
    }

    const pack = packsMap.get(item.id);
    const resDisponibilidad = evaluarDisponibilidadPack(pack);

    if (!pack || !resDisponibilidad.disponible) {
      itemsRemovidosIds.push({
        id: item.id,
        tipo: 'PACK',
        motivo: resDisponibilidad.motivo || 'Pack no disponible',
      });
      continue;
    }

    const preciosPack = obtenerPrecioPackParaCliente(pack, cliente);
    const precioPromo = preciosPack.precioFinal;
    const subtotalItem = precioPromo * item.cantidad;
    subtotalPacks += subtotalItem;

    const productosIncluidos = pack.items.map((pi) => ({
      nombre: pi.producto.nombre,
      cantidad: pi.cantidad,
    }));

    const presentacionPack = `Combo (${pack.items.reduce((acc, curr) => acc + curr.cantidad, 0)} unid.)`;

    itemsValidos.push({
      id: pack.id,
      tipo: 'PACK',
      packId: pack.id,
      cantidad: item.cantidad,
      nombre: pack.nombre,
      categoria: 'Packs y Promociones',
      presentacion: presentacionPack,
      imagen: pack.imagen,
      precioUnitarioPss: precioPromo,
      tipoPrecio: 'PROFESIONAL',
      subtotal: subtotalItem,
      disponible: true,
      productosIncluidos,
      tieneDistribuidor,
      nombreDistribuidor,
      precioOriginalTachado: preciosPack.precioOriginalTachado,
      porcentajeAhorroPack: preciosPack.porcentajeDescuento,
      tipoPrecioPack: preciosPack.tipoPrecio,
    });
  }

  const subtotalCalculado = subtotalProductos + subtotalPacks;

  // 6. Liquidar descuento en el servidor:
  // El descuento aplica a los productos individuales; los packs tienen precio cerrado bonificado
  let descuento: CalculoDescuentoResultado;

  if (cliente && subtotalProductos > 0) {
    const descProductos = await calcularDescuentoParaCliente(cliente.id, subtotalProductos, cliente);
    descuento = {
      tipoAplicado: descProductos.tipoAplicado,
      porcentaje: descProductos.porcentaje,
      montoDescuento: descProductos.montoDescuento,
      subtotalPss: subtotalCalculado,
      total: (subtotalProductos - descProductos.montoDescuento) + subtotalPacks,
      reglaId: descProductos.reglaId,
      etiqueta: descProductos.etiqueta,
    };
  } else {
    descuento = {
      tipoAplicado: 'SIN_DESCUENTO',
      porcentaje: 0,
      montoDescuento: 0,
      subtotalPss: subtotalCalculado,
      total: subtotalCalculado,
      reglaId: null,
      etiqueta: 'Sin descuento',
    };
  }

  return {
    itemsValidos,
    itemsRemovidosIds,
    subtotalPss: subtotalCalculado,
    tipoPrecio: tipoPrecioGeneral,
    descuento,
    mensajesAviso,
    tieneDistribuidor,
    nombreDistribuidor,
    subtotalProductos,
    subtotalPacks,
    esSinDistribuidor,
  };
}
