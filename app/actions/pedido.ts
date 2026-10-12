'use server';

import { prisma } from '@/lib/prisma';
import { obtenerSesionCliente } from '@/lib/services/session';
import { liquidarCarrito } from '@/lib/services/liquidacion';
import { obtenerNumeroWhatsappOFallar, generarUrlWhatsapp, ConfiguracionWhatsappError } from '@/lib/whatsapp';
import { EstadoCliente, EstadoPedido } from '@prisma/client';
import { TipoItemCarrito } from '@/lib/types/carrito';
import { setGuestOrderAuthCookie } from '@/lib/security/guestOrderAuth';

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

export interface OpcionesConfirmacionPedido {
  totalEsperado?: number;
}

export interface ConfirmarPedidoResultado {
  success: boolean;
  error?: string;
  itemsRemovidosIds?: string[];
  pedidoId?: string;
  numeroPedido?: number;
  whatsappUrl?: string;
  totalActualizado?: number;
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
 * 1. Admite tanto usuarios profesionales logueados como usuarios invitados sin sesión.
 * 2. Valida formato estricto de ítems y cantidades enteras > 0.
 * 3. Delega la validación comercial y de catálogo en el motor central liquidarCarrito({ modo: 'CONFIRMACION' }).
 * 4. Valida consistencia de importes si el cliente envía totalEsperado (prevención de cambios silenciosos).
 * 5. Guarda atómicamente el Pedido y sus PedidoItem en PostgreSQL mediante transacción.
 * 6. Genera el mensaje oficial y la URL de WhatsApp.
 * 7. Para pedidos de invitados, firma y establece la cookie de autorización HttpOnly.
 */
export async function confirmarPedidoAction(
  itemsCliente: ConfirmarPedidoItemInput[],
  datosInvitado?: DatosInvitadoInput,
  opciones?: OpcionesConfirmacionPedido
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
    let cliente: any = null;
    try {
      const sesion = await obtenerSesionCliente();
      if (sesion?.cliente) {
        cliente = sesion.cliente;
        if (cliente.estadoCliente === EstadoCliente.BLOQUEADO) {
          return {
            success: false,
            error: 'Tu cuenta profesional se encuentra bloqueada por administración. No es posible confirmar pedidos.',
          };
        }
      }
    } catch (authError) {
      cliente = null;
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

    // 2. Validar que la lista de ítems no esté vacía y contenga datos válidos
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

    // 3. Liquidar el pedido mediante el motor comercial central en modo CONFIRMACION
    const liquidacion = await liquidarCarrito(itemsCliente, cliente, { modo: 'CONFIRMACION' });

    if (!liquidacion.esValidoParaConfirmar) {
      return {
        success: false,
        error:
          liquidacion.errorConfirmacion ||
          'Uno o más productos o packs de tu pedido ya no están disponibles en el catálogo. Hemos actualizado tu carrito para que puedas revisarlo.',
        itemsRemovidosIds: liquidacion.itemsRemovidosIds.map((it) => it.id),
      };
    }

    if (liquidacion.itemsValidos.length === 0) {
      return {
        success: false,
        error: 'El carrito está vacío o no contiene productos válidos para confirmar.',
        itemsRemovidosIds: liquidacion.itemsRemovidosIds.map((it) => it.id),
      };
    }

    // 4. Verificación de discrepancia de importes respecto a lo visualizado previamente
    if (opciones?.totalEsperado !== undefined) {
      const diferencia = Math.abs(opciones.totalEsperado - liquidacion.totalFinal);
      if (diferencia > 0.01) {
        return {
          success: false,
          error: `Los precios o descuentos de tu carrito se han actualizado. Total anterior: ${formatoMoneda(opciones.totalEsperado)}, nuevo total: ${formatoMoneda(liquidacion.totalFinal)}. Por favor revisá tu carrito antes de confirmar.`,
          totalActualizado: liquidacion.totalFinal,
        };
      }
    }

    // 5. Determinar o preparar cliente para persistencia en base de datos
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

    // 6. Si hay clienteId, persistir Pedido y PedidoItems en PostgreSQL
    let pedidoGuardado: any = null;

    if (clienteIdParaPedido) {
      try {
        pedidoGuardado = await prisma.$transaction(async (tx) => {
          const nuevoPedido = await tx.pedido.create({
            data: {
              clienteId: clienteIdParaPedido!,
              estado: EstadoPedido.PEDIDO_RECIBIDO,
              subtotalPss: liquidacion.subtotalGeneral,
              descuentoAplicado: liquidacion.descuento.montoDescuento,
              porcentajeDescuento: liquidacion.descuento.porcentaje,
              total: liquidacion.totalFinal,
              items: {
                create: liquidacion.itemsValidos.map((i) => ({
                  productoId: i.productoId || null,
                  packId: i.packId || null,
                  variante: i.variante || null,
                  cantidad: i.cantidad,
                  precioUnitarioPss: i.precioUnitario,
                  subtotal: i.subtotal,
                })),
              },
            },
          });

          const mensajeWhatsapp = construirMensajeWhatsapp({
            numeroPedido: nuevoPedido.numeroPedido,
            cliente,
            datosInvitado,
            items: liquidacion.itemsValidos.map((i) => ({
              tipo: i.tipo,
              nombre: i.nombre,
              presentacion: i.presentacion,
              variante: i.variante || null,
              productosDetalle: i.productosDetalle,
              cantidad: i.cantidad,
              precioUnitarioPss: i.precioUnitario,
              subtotalItem: i.subtotal,
            })),
            subtotalPss: liquidacion.subtotalGeneral,
            montoDescuento: liquidacion.descuento.montoDescuento,
            porcentajeDescuento: liquidacion.descuento.porcentaje,
            etiquetaDescuento: liquidacion.descuento.etiqueta,
            totalFinal: liquidacion.totalFinal,
            tipoPrecio: liquidacion.tipoPrecio,
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
      // Para pedidos realizados sin sesión de cliente profesional, establecer cookie HttpOnly firmada
      if (!cliente && pedidoGuardado.id) {
        try {
          await setGuestOrderAuthCookie(pedidoGuardado.id);
        } catch (cookieErr) {
          console.warn('No se pudo establecer la cookie de autorización de invitado:', cookieErr);
        }
      }

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
      cliente,
      datosInvitado,
      items: liquidacion.itemsValidos.map((i) => ({
        tipo: i.tipo,
        nombre: i.nombre,
        presentacion: i.presentacion,
        variante: i.variante || null,
        productosDetalle: i.productosDetalle,
        cantidad: i.cantidad,
        precioUnitarioPss: i.precioUnitario,
        subtotalItem: i.subtotal,
      })),
      subtotalPss: liquidacion.subtotalGeneral,
      montoDescuento: liquidacion.descuento.montoDescuento,
      porcentajeDescuento: liquidacion.descuento.porcentaje,
      etiquetaDescuento: liquidacion.descuento.etiqueta,
      totalFinal: liquidacion.totalFinal,
      tipoPrecio: liquidacion.tipoPrecio,
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
