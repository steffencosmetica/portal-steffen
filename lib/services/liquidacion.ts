import { prisma } from '@/lib/prisma';
import { TipoItemCarrito } from '@/lib/types/carrito';
import { Cliente, Zona, Distribuidor, EstadoCliente } from '@prisma/client';
import { determinarPrecioVisible } from '@/lib/services/precios';
import { parsearVariantes, obtenerPreciosEfectivosProducto, VarianteProducto } from '@/lib/utils/variantes';
import { evaluarDisponibilidadPack, obtenerPrecioPackParaCliente } from '@/lib/services/packs';
import { calcularDescuentoParaCliente, CalculoDescuentoResultado } from '@/lib/services/descuentos';
import { tieneDistribuidorActivo, ClienteZonaLike } from '@/lib/services/zona';

export interface ItemCarritoEntrada {
  id: string;
  tipo: TipoItemCarrito;
  cantidad: number;
  variante?: string | null;
}

export interface ItemLiquidado {
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
  precioUnitario: number;
  tipoPrecio: 'PUBLICO' | 'PROFESIONAL';
  precioProfesionalBloqueado?: number | null;
  subtotal: number;
  disponible: boolean;
  motivoNoDisponible?: string;
  productosIncluidos?: Array<{ nombre: string; cantidad: number }>;
  productosDetalle?: string;
  tieneDistribuidor?: boolean;
  nombreDistribuidor?: string | null;
  precioOriginalTachado?: number | null;
  porcentajeAhorroPack?: number | null;
  tipoPrecioPack?: 'DISTRIBUIDOR' | 'DIRECTO' | 'PROMOCIONAL';
}

export interface ItemRemovidoLiquidacion {
  id: string;
  tipo: TipoItemCarrito;
  variante?: string | null;
  motivo: string;
}

export interface OpcionesLiquidacion {
  /**
   * 'CARRITO': Los ítems no disponibles se reportan en itemsRemovidosIds para actualizar la UI amigablemente.
   * 'CONFIRMACION': Si algún ítem no está disponible o no autorizado, esValidoParaConfirmar es false y se genera un error descriptivo.
   */
  modo?: 'CARRITO' | 'CONFIRMACION';
  prismaClient?: any;
}

export interface LiquidacionCarritoResultado {
  esValidoParaConfirmar: boolean;
  errorConfirmacion?: string;
  itemsValidos: ItemLiquidado[];
  itemsRemovidosIds: ItemRemovidoLiquidacion[];
  subtotalProductos: number;
  subtotalPacks: number;
  subtotalGeneral: number;
  tipoPrecio: 'PUBLICO' | 'PROFESIONAL';
  descuento: CalculoDescuentoResultado;
  totalFinal: number;
  tieneDistribuidor: boolean;
  nombreDistribuidor: string | null;
  esSinDistribuidor: boolean;
  mensajesAviso: string[];
}

/**
 * Motor Central de Liquidación Comercial Steffen:
 * Unifica el cálculo de precios, variantes, combos, distribuidores, descuentos y totales.
 * Utilizado de manera consistente tanto al visualizar el carrito como al validar la confirmación de pedidos.
 *
 * Reglas Comerciales Vigentes:
 * 1. Visitante sin cuenta: precioEcommerce, sin descuento, sin packs exclusivos.
 * 2. Registrado PENDIENTE_APROBACION: precioEcommerce, descuento de 1ª compra (20%), sin reposición, sin packs.
 * 3. Registrado ACTIVO: precioPss, descuento de 1ª compra (20%) si pedidosEfectivosCount === 0.
 * 4. Reposición: solo para salones ACTIVO sin distribuidor activo (desde fechaCompletado del último COMPLETADO).
 * 5. Packs: exclusivos para salones ACTIVO, precio cerrado según distribuidor (precioDistribuidor vs precioDirecto).
 * 6. Sin acumulación de descuentos generales sobre packs (el descuento aplica a productos individuales).
 */
export async function liquidarCarrito(
  itemsCliente: ItemCarritoEntrada[],
  cliente: (Cliente & ClienteZonaLike) | null,
  opciones: OpcionesLiquidacion = {}
): Promise<LiquidacionCarritoResultado> {
  const modo = opciones.modo || 'CARRITO';
  const db = opciones.prismaClient || prisma;

  const esClienteRegistrado = Boolean(cliente && cliente.id);
  const esClienteActivo = Boolean(
    esClienteRegistrado &&
      (cliente?.estadoCliente === EstadoCliente.ACTIVO || (cliente?.estadoCliente as string) === 'ACTIVO')
  );
  const esPendienteAprobacion = Boolean(
    esClienteRegistrado &&
      (cliente?.estadoCliente === EstadoCliente.PENDIENTE_APROBACION ||
        (cliente?.estadoCliente as string) === 'PENDIENTE_APROBACION')
  );

  const tieneDistribuidor = tieneDistribuidorActivo(cliente);
  const esSinDistribuidor = Boolean(esClienteRegistrado && !tieneDistribuidor);
  const nombreDistribuidor =
    tieneDistribuidor && cliente?.zona?.distribuidor?.nombre
      ? cliente.zona.distribuidor.nombre
      : null;

  const tipoPrecioGeneral: 'PUBLICO' | 'PROFESIONAL' = esClienteActivo ? 'PROFESIONAL' : 'PUBLICO';

  const itemsValidos: ItemLiquidado[] = [];
  const itemsRemovidosIds: ItemRemovidoLiquidacion[] = [];
  const mensajesAviso: string[] = [];
  let esValidoParaConfirmar = true;
  let errorConfirmacion: string | undefined = undefined;

  let subtotalProductos = 0;
  let subtotalPacks = 0;

  if (!itemsCliente || itemsCliente.length === 0) {
    return {
      esValidoParaConfirmar: false,
      errorConfirmacion: 'El carrito está vacío. Agregá productos antes de confirmar el pedido.',
      itemsValidos: [],
      itemsRemovidosIds: [],
      subtotalProductos: 0,
      subtotalPacks: 0,
      subtotalGeneral: 0,
      tipoPrecio: tipoPrecioGeneral,
      descuento: {
        tipoAplicado: 'SIN_DESCUENTO',
        porcentaje: 0,
        montoDescuento: 0,
        subtotalPss: 0,
        total: 0,
        reglaId: null,
        etiqueta: 'Sin descuento',
      },
      totalFinal: 0,
      tieneDistribuidor,
      nombreDistribuidor,
      esSinDistribuidor,
      mensajesAviso: [],
    };
  }

  // Separar productos y packs
  const productosItems = itemsCliente.filter((i) => i.tipo === 'PRODUCTO');
  const packsItems = itemsCliente.filter((i) => i.tipo === 'PACK');

  const productosIds = Array.from(new Set(productosItems.map((i) => i.id)));
  const packsIds = Array.from(new Set(packsItems.map((i) => i.id)));

  // 1. Consultar productos en DB
  const productosDB =
    productosIds.length > 0
      ? ((await db.producto.findMany({
          where: { id: { in: productosIds } },
        })) as any[])
      : [];
  const productosMap = new Map(productosDB.map((p) => [p.id, p]));

  // 2. Procesar productos
  for (const item of productosItems) {
    const prod = productosMap.get(item.id);

    if (!prod || !prod.activo) {
      itemsRemovidosIds.push({
        id: item.id,
        tipo: 'PRODUCTO',
        variante: item.variante,
        motivo: 'Producto no disponible o discontinuado',
      });
      if (modo === 'CONFIRMACION') {
        esValidoParaConfirmar = false;
        errorConfirmacion =
          errorConfirmacion ||
          'Uno o más productos de tu pedido ya no están disponibles en el catálogo. Revisá tu carrito antes de confirmar.';
      }
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
      precioUnitario: precio,
      tipoPrecio,
      precioProfesionalBloqueado: esPendienteAprobacion ? precioPssEfectivo : null,
      subtotal: subtotalItem,
      disponible: true,
    });
  }

  // 3. Consultar y procesar Packs promocionales
  const packsDB =
    packsIds.length > 0
      ? ((await db.pack.findMany({
          where: { id: { in: packsIds } },
          include: {
            items: {
              include: {
                producto: true,
              },
            },
          },
        })) as any[])
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
      if (modo === 'CONFIRMACION') {
        esValidoParaConfirmar = false;
        errorConfirmacion =
          errorConfirmacion ||
          'Los packs y combos profesionales son exclusivos para salones profesionales con cuenta activa. Por favor quitá los packs de tu pedido para continuar.';
      }
      continue;
    }

    const pack = packsMap.get(item.id);
    const resDisponibilidad = evaluarDisponibilidadPack(pack);

    if (!pack || !resDisponibilidad.disponible) {
      const motivo = resDisponibilidad.motivo || 'Pack no disponible';
      itemsRemovidosIds.push({
        id: item.id,
        tipo: 'PACK',
        motivo,
      });
      if (modo === 'CONFIRMACION') {
        esValidoParaConfirmar = false;
        errorConfirmacion =
          errorConfirmacion ||
          'Uno o más packs de tu pedido ya no están disponibles. Revisá tu carrito antes de confirmar.';
      }
      continue;
    }

    const preciosPack = obtenerPrecioPackParaCliente(pack, cliente);
    const precioPromo = preciosPack.precioFinal;
    const subtotalItem = precioPromo * item.cantidad;
    subtotalPacks += subtotalItem;

    const productosIncluidos = pack.items.map((pi: any) => ({
      nombre: pi.producto.nombre,
      cantidad: pi.cantidad,
    }));

    const detalleStr =
      pack.items && pack.items.length > 0
        ? pack.items.map((pi: any) => `${pi.cantidad}x ${pi.producto.nombre}`).join(' + ')
        : pack.descripcion;

    const presentacionPack = `Combo (${pack.items.reduce((acc: number, curr: any) => acc + curr.cantidad, 0)} unid.)`;

    itemsValidos.push({
      id: pack.id,
      tipo: 'PACK',
      packId: pack.id,
      cantidad: item.cantidad,
      nombre: pack.nombre,
      categoria: 'Packs y Promociones',
      presentacion: presentacionPack,
      imagen: pack.imagen,
      precioUnitario: precioPromo,
      tipoPrecio: 'PROFESIONAL',
      subtotal: subtotalItem,
      disponible: true,
      productosIncluidos,
      productosDetalle: detalleStr,
      tieneDistribuidor,
      nombreDistribuidor,
      precioOriginalTachado: preciosPack.precioOriginalTachado,
      porcentajeAhorroPack: preciosPack.porcentajeDescuento,
      tipoPrecioPack: preciosPack.tipoPrecio,
    });
  }

  const subtotalGeneral = subtotalProductos + subtotalPacks;

  // 4. Liquidación de Descuentos Dinámicos:
  // Aplica exclusivamente a clientes registrados sobre el subtotal de productos individuales.
  let descuento: CalculoDescuentoResultado;

  if (esClienteRegistrado && cliente && subtotalProductos > 0) {
    const descProductos = await calcularDescuentoParaCliente(
      cliente.id,
      subtotalProductos,
      cliente,
      db
    );
    descuento = {
      tipoAplicado: descProductos.tipoAplicado,
      porcentaje: descProductos.porcentaje,
      montoDescuento: descProductos.montoDescuento,
      subtotalPss: subtotalGeneral,
      total: subtotalProductos - descProductos.montoDescuento + subtotalPacks,
      reglaId: descProductos.reglaId,
      etiqueta: descProductos.etiqueta,
    };
  } else {
    descuento = {
      tipoAplicado: 'SIN_DESCUENTO',
      porcentaje: 0,
      montoDescuento: 0,
      subtotalPss: subtotalGeneral,
      total: subtotalGeneral,
      reglaId: null,
      etiqueta: 'Sin descuento',
    };
  }

  return {
    esValidoParaConfirmar,
    errorConfirmacion,
    itemsValidos,
    itemsRemovidosIds,
    subtotalProductos,
    subtotalPacks,
    subtotalGeneral,
    tipoPrecio: tipoPrecioGeneral,
    descuento,
    totalFinal: descuento.total,
    tieneDistribuidor,
    nombreDistribuidor,
    esSinDistribuidor,
    mensajesAviso,
  };
}
