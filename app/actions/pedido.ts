'use server';

import { prisma } from '@/lib/prisma';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { determinarPrecioVisible } from '@/lib/services/precios';
import { calcularDescuentoParaCliente } from '@/lib/services/descuentos';
import { calcularDisponibilidadPack, obtenerPrecioPackParaCliente } from '@/lib/services/packs';
import { obtenerNumeroWhatsappOFallar, generarUrlWhatsapp, ConfiguracionWhatsappError } from '@/lib/whatsapp';
import { EstadoCliente, EstadoPedido } from '@prisma/client';
import { TipoItemCarrito } from '@/lib/types/carrito';
import { parsearVariantes, obtenerPreciosEfectivosProducto } from '@/lib/utils/variantes';

export interface ConfirmarPedidoItemInput {
  id: string;
  tipo: TipoItemCarrito;
  cantidad: number;
  variante?: string | null;
}

export interface ConfirmarPedidoResultado {
  success: boolean;
  error?: string;
  itemsRemovidosIds?: string[];
  pedidoId?: string;
  numeroPedido?: number;
  whatsappUrl?: string;
}

/**
 * Formatea valores numéricos a Pesos Argentinos (ARS)
 */
function formatoMoneda(valor: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(valor);
}

/**
 * Genera el texto reglamentario para el mensaje de WhatsApp.
 * Cumple con la Regla 3: "El costo de envío será confirmado posteriormente por WhatsApp."
 * Incluye aviso si la cuenta está en estado PENDIENTE_APROBACION y distingue packs de productos individuales.
 */
function construirMensajeWhatsapp(params: {
  numeroPedido: number;
  cliente: {
    nombre: string;
    apellido: string;
    salon: string;
    whatsapp: string;
    localidad: string;
    provincia: string;
    estadoCliente: EstadoCliente;
  };
  items: Array<{
    tipo: TipoItemCarrito;
    nombre: string;
    presentacion: string;
    variante?: string | null;
    productosDetalle?: string;
    cantidad: number;
    precioUnitarioPss: number;
    subtotalItem: number;
  }>;
  subtotalPss: number;
  montoDescuento: number;
  porcentajeDescuento: number;
  etiquetaDescuento: string;
  totalFinal: number;
  tipoPrecio: 'PUBLICO' | 'PROFESIONAL';
}): string {
  const {
    numeroPedido,
    cliente,
    items,
    subtotalPss,
    montoDescuento,
    etiquetaDescuento,
    totalFinal,
    tipoPrecio,
  } = params;

  const productosSueltos = items.filter((i) => i.tipo === 'PRODUCTO');
  const packsCombos = items.filter((i) => i.tipo === 'PACK');

  let bloqueDetalle = '';

  if (productosSueltos.length > 0) {
    const lineasProductos = productosSueltos
      .map((item) => {
        const detallePresentacion = item.variante
          ? `${item.presentacion} • ${item.variante}`
          : item.presentacion;
        return `• ${item.cantidad}x ${item.nombre} (${detallePresentacion})\n  ${formatoMoneda(item.precioUnitarioPss)} c/u → *${formatoMoneda(item.subtotalItem)}*`;
      })
      .join('\n\n');
    bloqueDetalle += `📦 *PRODUCTOS INDIVIDUALES:*\n${lineasProductos}\n\n`;
  }

  if (packsCombos.length > 0) {
    const lineasPacks = packsCombos
      .map(
        (item) =>
          `🎁 *COMBO / PACK: ${item.nombre}* (${item.cantidad}x)\n  _Incluye: ${item.productosDetalle || ''}_\n  ${formatoMoneda(item.precioUnitarioPss)} c/u → *${formatoMoneda(item.subtotalItem)}*`
      )
      .join('\n\n');
    bloqueDetalle += `🎁 *PACKS Y COMBOS:*\n${lineasPacks}\n\n`;
  }

  const lineaDescuento =
    montoDescuento > 0
      ? `• Descuento (${etiquetaDescuento}): -${formatoMoneda(montoDescuento)}`
      : `• Descuento: Sin descuento`;

  const avisoEstado =
    cliente.estadoCliente === EstadoCliente.PENDIENTE_APROBACION
      ? `⚠️ *Nota:* Pedido generado con precios públicos de referencia (cuenta profesional pendiente de aprobación).\n\n`
      : '';

  const labelSubtotal = tipoPrecio === 'PROFESIONAL' ? 'Subtotal Salón Profesional' : 'Subtotal Público';

  return (
    `*¡Hola Steffen Cosmética Capilar!* 👋\n` +
    `Quisiera confirmar el siguiente pedido profesional para mi salón:\n\n` +
    avisoEstado +
    `🏷️ *PEDIDO N°:* #${numeroPedido}\n\n` +
    `💇 *DATOS DEL SALÓN:*\n` +
    `• *Salón:* ${cliente.salon}\n` +
    `• *Profesional:* ${cliente.nombre} ${cliente.apellido}\n` +
    `• *Ubicación:* ${cliente.localidad}, ${cliente.provincia}\n` +
    `• *WhatsApp:* ${cliente.whatsapp}\n\n` +
    bloqueDetalle +
    `💰 *RESUMEN DE PAGO:*\n` +
    `• ${labelSubtotal}: ${formatoMoneda(subtotalPss)}\n` +
    `${lineaDescuento}\n` +
    `• *TOTAL A TRANSFERIR: ${formatoMoneda(totalFinal)}*\n\n` +
    `🚚 *ENVÍO:*\n` +
    `El costo de envío será confirmado posteriormente por WhatsApp.\n\n` +
    `Aguardo los datos de transferencia para enviar el comprobante. ¡Muchas gracias!`
  );
}

/**
 * Server Action que procesa la confirmación del pedido:
 * 1. Obtiene la sesión autenticada en el servidor (nunca confía en clienteId del navegador).
 * 2. Valida formato estricto de ítems y cantidades enteras > 0.
 * 3. Re-consulta productos y packs frescos de la base de datos, validando vigencia y stock de packs.
 * 4. Aplica determinarPrecioVisible() en productos y precioPromocional en packs.
 * 5. Guarda atómicamente el Pedido y sus PedidoItem (con productoId o packId) en PostgreSQL.
 * 6. Genera la URL oficial de WhatsApp con el pedido ya persistido.
 */
export async function confirmarPedidoAction(
  itemsCliente: ConfirmarPedidoItemInput[]
): Promise<ConfirmarPedidoResultado> {
  try {
    let numeroWhatsapp: string;
    try {
      numeroWhatsapp = obtenerNumeroWhatsappOFallar();
    } catch (configError) {
      if (configError instanceof ConfiguracionWhatsappError) {
        return {
          success: false,
          error: 'Error de configuración del servidor. Contactá al administrador.',
        };
      }
      throw configError;
    }

    // 1. Obtener cliente autenticado en el servidor
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: 'Tu sesión ha expirado o no has iniciado sesión. Por favor ingresá nuevamente.',
      };
    }

    const usuario = await prisma.usuario.findUnique({
      where: { authUserId: user.id },
      include: {
        cliente: {
          include: { zona: true },
        },
      },
    });

    if (!usuario || !usuario.cliente) {
      return {
        success: false,
        error: 'No se encontró el perfil profesional de salón asociado a esta cuenta.',
      };
    }

    const cliente = usuario.cliente;

    if (cliente.estadoCliente === EstadoCliente.BLOQUEADO) {
      return {
        success: false,
        error: 'Tu cuenta profesional se encuentra bloqueada por administración. No es posible confirmar pedidos.',
      };
    }

    // 2. Validar que la lista de ítems no esté vacía
    if (!itemsCliente || !Array.isArray(itemsCliente) || itemsCliente.length === 0) {
      return {
        success: false,
        error: 'El carrito está vacío. Agregá productos antes de confirmar el pedido.',
      };
    }

    for (const item of itemsCliente) {
      if (
        !item ||
        typeof item.id !== 'string' ||
        (item.tipo !== 'PRODUCTO' && item.tipo !== 'PACK') ||
        typeof item.cantidad !== 'number' ||
        !Number.isInteger(item.cantidad) ||
        item.cantidad <= 0
      ) {
        return {
          success: false,
          error: 'Se detectaron cantidades o ítems inválidos en el pedido.',
        };
      }
    }

    // 3. Separar productos y packs
    const productosItems = itemsCliente.filter((i) => i.tipo === 'PRODUCTO');
    const packsItems = itemsCliente.filter((i) => i.tipo === 'PACK');

    const productosIds = productosItems.map((i) => i.id);
    const productosDB = (productosIds.length > 0
      ? await prisma.producto.findMany({
          where: { id: { in: productosIds } },
        })
      : []) as any[];
    const productosMap = new Map(productosDB.map((p) => [p.id, p]));

    const itemsRemovidos: string[] = [];

    // Validar productos sueltos
    for (const item of productosItems) {
      const prod = productosMap.get(item.id);
      if (!prod || !prod.activo) {
        itemsRemovidos.push(item.id);
      }
    }

    // Validar packs
    const packsProcesadosMap = new Map<string, { pack: any; precioPromo: number; detalle: string }>();

    for (const item of packsItems) {
      if (cliente.estadoCliente !== EstadoCliente.ACTIVO) {
        itemsRemovidos.push(item.id);
        continue;
      }

      const resDisp = await calcularDisponibilidadPack(item.id);
      if (!resDisp.disponible || !resDisp.pack) {
        itemsRemovidos.push(item.id);
      } else {
        const p = resDisp.pack;
        const detalle = p.items && p.items.length > 0
          ? p.items.map((pi) => `${pi.cantidad}x ${pi.producto.nombre}`).join(' + ')
          : p.descripcion;
        const precioEfectivoPack = obtenerPrecioPackParaCliente(p, cliente).precioFinal;

        packsProcesadosMap.set(p.id, {
          pack: p,
          precioPromo: precioEfectivoPack,
          detalle,
        });
      }
    }

    if (itemsRemovidos.length > 0) {
      return {
        success: false,
        error:
          'Uno o más productos o packs de tu pedido ya no están disponibles en el catálogo. Hemos actualizado tu carrito para que puedas revisarlo.',
        itemsRemovidosIds: itemsRemovidos,
      };
    }

    // 4. Calcular precios y subtotales
    let subtotalProductos = 0;
    let subtotalPacks = 0;
    const tipoPrecioGeneral: 'PUBLICO' | 'PROFESIONAL' =
      cliente?.estadoCliente === 'ACTIVO' ? 'PROFESIONAL' : 'PUBLICO';

    const itemsProcesadosFinales: Array<{
      tipo: TipoItemCarrito;
      productoId: string | null;
      packId: string | null;
      nombre: string;
      presentacion: string;
      variante?: string | null;
      productosDetalle?: string;
      cantidad: number;
      precioUnitarioPss: number;
      subtotalItem: number;
    }> = [];

    // Procesar productos
    for (const item of productosItems) {
      const prod = productosMap.get(item.id)!;
      const { precioPss: precioPssEfectivo, precioEcommerce: precioEcomEfectivo } =
        obtenerPreciosEfectivosProducto(
          {
            precioPss: Number(prod.precioPss),
            precioEcommerce: Number(prod.precioEcommerce),
            variantes: parsearVariantes(prod.variantes),
          },
          item.variante
        );

      const { precio } = determinarPrecioVisible(cliente, {
        precioPss: precioPssEfectivo,
        precioEcommerce: precioEcomEfectivo,
      });

      const subtotalItem = precio * item.cantidad;
      subtotalProductos += subtotalItem;

      itemsProcesadosFinales.push({
        tipo: 'PRODUCTO',
        productoId: prod.id,
        packId: null,
        nombre: prod.nombre,
        presentacion: prod.presentacion,
        variante: item.variante ? item.variante.trim() : null,
        cantidad: item.cantidad,
        precioUnitarioPss: precio,
        subtotalItem,
      });
    }

    // Procesar packs
    for (const item of packsItems) {
      const { pack, precioPromo, detalle } = packsProcesadosMap.get(item.id)!;
      const subtotalItem = precioPromo * item.cantidad;
      subtotalPacks += subtotalItem;

      itemsProcesadosFinales.push({
        tipo: 'PACK',
        productoId: null,
        packId: pack.id,
        nombre: pack.nombre,
        presentacion: 'Combo Promocional',
        variante: null,
        productosDetalle: detalle,
        cantidad: item.cantidad,
        precioUnitarioPss: precioPromo,
        subtotalItem,
      });
    }

    const subtotalCalculado = subtotalProductos + subtotalPacks;

    // 5. Liquidar Descuentos: El descuento por reposición/primer pedido aplica a los productos individuales
    // Los packs tienen precio fijo final ya bonificado
    let montoDescuento = 0;
    let porcentajeDescuento = 0;
    let totalFinal = subtotalCalculado;
    let etiquetaDescuento = 'Sin descuento';

    if (cliente && subtotalProductos > 0) {
      const descuento = await calcularDescuentoParaCliente(cliente.id, subtotalProductos);
      montoDescuento = descuento.montoDescuento;
      porcentajeDescuento = descuento.porcentaje;
      totalFinal = (subtotalProductos - montoDescuento) + subtotalPacks;
      etiquetaDescuento = descuento.etiqueta;
    }

    // 6. Transacción atómica en PostgreSQL vía Prisma: guardar Pedido y PedidoItems
    const pedidoGuardado = await prisma.$transaction(async (tx) => {
      const nuevoPedido = await tx.pedido.create({
        data: {
          clienteId: cliente.id,
          estado: EstadoPedido.PEDIDO_RECIBIDO,
          subtotalPss: subtotalCalculado,
          descuentoAplicado: montoDescuento,
          porcentajeDescuento: porcentajeDescuento,
          total: totalFinal,
          items: {
            create: itemsProcesadosFinales.map((i) => ({
              productoId: i.productoId,
              packId: i.packId,
              variante: i.variante || null,
              cantidad: i.cantidad,
              precioUnitarioPss: i.precioUnitarioPss,
              subtotal: i.subtotalItem,
            })),
          },
        },
      });

      const mensajeWhatsapp = construirMensajeWhatsapp({
        numeroPedido: nuevoPedido.numeroPedido,
        cliente: {
          nombre: cliente.nombre,
          apellido: cliente.apellido,
          salon: cliente.salon,
          whatsapp: cliente.whatsapp,
          localidad: cliente.localidad,
          provincia: cliente.provincia,
          estadoCliente: cliente.estadoCliente,
        },
        items: itemsProcesadosFinales,
        subtotalPss: subtotalCalculado,
        montoDescuento,
        porcentajeDescuento,
        etiquetaDescuento,
        totalFinal,
        tipoPrecio: tipoPrecioGeneral,
      });

      return await tx.pedido.update({
        where: { id: nuevoPedido.id },
        data: {
          mensajeWhatsappGenerado: mensajeWhatsapp,
        },
      });
    });

    const whatsappUrl = generarUrlWhatsapp(pedidoGuardado.mensajeWhatsappGenerado || '', numeroWhatsapp);

    return {
      success: true,
      pedidoId: pedidoGuardado.id,
      numeroPedido: pedidoGuardado.numeroPedido,
      whatsappUrl,
    };
  } catch (error) {
    console.error('Error al confirmar y guardar el pedido:', error);
    return {
      success: false,
      error: 'Hubo un error al procesar y guardar tu pedido en el servidor. Por favor intentá nuevamente.',
    };
  }
}
