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

export interface DatosInvitadoInput {
  nombre?: string;
  salon?: string;
  telefono?: string;
  localidad?: string;
  provincia?: string;
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
 * Admite tanto clientes profesionales registrados como compradores invitados sin inicio de sesión.
 */
function construirMensajeWhatsapp(params: {
  numeroPedido?: number;
  cliente?: {
    nombre: string;
    apellido: string;
    salon: string;
    whatsapp: string;
    localidad: string;
    provincia: string;
    estadoCliente: EstadoCliente;
  } | null;
  datosInvitado?: DatosInvitadoInput | null;
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
    datosInvitado,
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
      ? `• Descuento (${etiquetaDescuento}): -${formatoMoneda(montoDescuento)}\n`
      : '';

  const labelSubtotal = tipoPrecio === 'PROFESIONAL' ? 'Subtotal Salón Profesional' : 'Subtotal';

  // Si es un cliente registrado
  if (cliente) {
    const avisoEstado =
      cliente.estadoCliente === EstadoCliente.PENDIENTE_APROBACION
        ? `⚠️ *Nota:* Pedido generado con precios públicos de referencia (cuenta profesional pendiente de aprobación).\n\n`
        : '';

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
      lineaDescuento +
      `• *TOTAL A TRANSFERIR: ${formatoMoneda(totalFinal)}*\n\n` +
      `🚚 *ENVÍO:*\n` +
      `El costo de envío será confirmado posteriormente por WhatsApp.\n\n` +
      `Aguardo los datos de transferencia para enviar el comprobante. ¡Muchas gracias!`
    );
  }

  // Si es un pedido de invitado (sin login)
  let bloqueDatosInvitado = '';
  if (datosInvitado) {
    const lineasInfo: string[] = [];
    if (datosInvitado.nombre?.trim()) lineasInfo.push(`• *Nombre:* ${datosInvitado.nombre.trim()}`);
    if (datosInvitado.salon?.trim()) lineasInfo.push(`• *Salón / Negocio:* ${datosInvitado.salon.trim()}`);
    const ubicacion = [datosInvitado.localidad?.trim(), datosInvitado.provincia?.trim()].filter(Boolean).join(', ');
    if (ubicacion) lineasInfo.push(`• *Ubicación:* ${ubicacion}`);
    if (datosInvitado.telefono?.trim()) lineasInfo.push(`• *Teléfono:* ${datosInvitado.telefono.trim()}`);

    if (lineasInfo.length > 0) {
      bloqueDatosInvitado = `👤 *DATOS DEL CONTACTO:*\n${lineasInfo.join('\n')}\n\n`;
    }
  }

  return (
    `*¡Hola Steffen Cosmética Capilar!* 👋\n` +
    `Quisiera realizar el siguiente pedido por WhatsApp:\n\n` +
    (numeroPedido ? `🏷️ *PEDIDO N°:* #${numeroPedido}\n\n` : '') +
    bloqueDatosInvitado +
    bloqueDetalle +
    `💰 *RESUMEN DE PAGO:*\n` +
    `• ${labelSubtotal}: ${formatoMoneda(subtotalPss)}\n` +
    lineaDescuento +
    `• *TOTAL A TRANSFERIR: ${formatoMoneda(totalFinal)}*\n\n` +
    `🚚 *ENVÍO:*\n` +
    `El costo de envío será confirmado posteriormente por WhatsApp según la localidad de destino.\n\n` +
    `Aguardo los datos de transferencia para enviar el comprobante. ¡Muchas gracias!`
  );
}

/**
 * Server Action que procesa la confirmación del pedido:
 * 1. Admite tanto usuarios logueados como usuarios invitados sin sesión.
 * 2. Valida formato estricto de ítems y cantidades enteras > 0.
 * 3. Re-consulta productos y packs frescos de la base de datos, validando vigencia y stock de packs.
 * 4. Aplica determinarPrecioVisible() en productos y precioPromocional en packs.
 * 5. Guarda atómicamente el Pedido y sus PedidoItem en PostgreSQL si es posible.
 * 6. Genera la URL oficial de WhatsApp con el pedido.
 */
export async function confirmarPedidoAction(
  itemsCliente: ConfirmarPedidoItemInput[],
  datosInvitado?: DatosInvitadoInput
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

    // 1. Obtener cliente autenticado en el servidor (opcional: usuarios invitados pueden comprar sin login)
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let cliente: any = null;

    if (user) {
      const usuario = await prisma.usuario.findUnique({
        where: { authUserId: user.id },
        include: {
          cliente: {
            include: { zona: true },
          },
        },
      });

      if (usuario?.cliente) {
        cliente = usuario.cliente;
        if (cliente.estadoCliente === EstadoCliente.BLOQUEADO) {
          return {
            success: false,
            error: 'Tu cuenta profesional se encuentra bloqueada por administración. No es posible confirmar pedidos.',
          };
        }
      }
    }

    // Si el usuario no está autenticado como cliente profesional, los datos de contacto son obligatorios
    if (!cliente) {
      const nombreValido = datosInvitado?.nombre && datosInvitado.nombre.trim().length >= 2;
      const localidadValida = datosInvitado?.localidad && datosInvitado.localidad.trim().length >= 2;
      const telefonoValido = datosInvitado?.telefono && datosInvitado.telefono.trim().length >= 5;

      if (!nombreValido || !localidadValida || !telefonoValido) {
        return {
          success: false,
          error: 'Por favor completá todos los datos de contacto obligatorios: Nombre, Localidad/Ciudad y Teléfono de contacto.',
        };
      }
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

    // 5. Liquidar Descuentos: El descuento por reposición/primer pedido aplica a clientes registrados
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

    // 6. Determinar o preparar cliente para persistencia en base de datos
    let clienteIdParaPedido: string | null = cliente ? cliente.id : null;

    if (!clienteIdParaPedido) {
      try {
        let clienteInvitado = await prisma.cliente.findFirst({
          where: { email: 'invitado@steffen.com' },
        });

        if (!clienteInvitado) {
          clienteInvitado = await prisma.cliente.create({
            data: {
              nombre: datosInvitado?.nombre?.trim() || 'Cliente Invitado',
              apellido: 'Web',
              salon: datosInvitado?.salon?.trim() || 'Consumidor Final',
              whatsapp: datosInvitado?.telefono?.trim() || '5492230000000',
              email: 'invitado@steffen.com',
              provincia: datosInvitado?.provincia?.trim() || 'A coordinar',
              localidad: datosInvitado?.localidad?.trim() || 'A coordinar',
              tipoDeNegocio: 'Consumidor / Salón No Registrado',
              estadoCliente: EstadoCliente.PENDIENTE_APROBACION,
            },
          });
        }
        clienteIdParaPedido = clienteInvitado.id;
      } catch (errCliente) {
        console.warn('No se pudo asociar a cliente invitado en BD:', errCliente);
      }
    }

    // 7. Si hay clienteId, persistir Pedido y PedidoItems en PostgreSQL
    let pedidoGuardado: any = null;

    if (clienteIdParaPedido) {
      try {
        pedidoGuardado = await prisma.$transaction(async (tx) => {
          const nuevoPedido = await tx.pedido.create({
            data: {
              clienteId: clienteIdParaPedido!,
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
            cliente,
            datosInvitado,
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
      } catch (errTx) {
        console.warn('No se pudo guardar la orden en la BD, generando WhatsApp directamente:', errTx);
      }
    }

    if (pedidoGuardado) {
      const whatsappUrl = generarUrlWhatsapp(pedidoGuardado.mensajeWhatsappGenerado || '', numeroWhatsapp);
      return {
        success: true,
        pedidoId: pedidoGuardado.id,
        numeroPedido: pedidoGuardado.numeroPedido,
        whatsappUrl,
      };
    }

    // Fallback garantizado sin bloquear al usuario: generar el mensaje directo de WhatsApp
    const numeroPedidoFallback = Math.floor(100000 + Math.random() * 900000);
    const mensajeFallback = construirMensajeWhatsapp({
      numeroPedido: numeroPedidoFallback,
      cliente: null,
      datosInvitado,
      items: itemsProcesadosFinales,
      subtotalPss: subtotalCalculado,
      montoDescuento,
      porcentajeDescuento,
      etiquetaDescuento,
      totalFinal,
      tipoPrecio: tipoPrecioGeneral,
    });
    const whatsappUrlFallback = generarUrlWhatsapp(mensajeFallback, numeroWhatsapp);

    return {
      success: true,
      pedidoId: 'invitado',
      numeroPedido: numeroPedidoFallback,
      whatsappUrl: whatsappUrlFallback,
    };
  } catch (error) {
    console.error('Error al confirmar y procesar el pedido:', error);
    return {
      success: false,
      error: 'Hubo un error al procesar el pedido. Por favor intentá nuevamente.',
    };
  }
}
