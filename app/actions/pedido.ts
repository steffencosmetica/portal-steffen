'use server';

import { prisma } from '@/lib/prisma';
import { obtenerSesionCliente } from '@/lib/services/session';
import { liquidarCarrito } from '@/lib/services/liquidacion';
import { obtenerNumeroWhatsappOFallar, generarUrlWhatsapp, ConfiguracionWhatsappError } from '@/lib/whatsapp';
import { EstadoCliente, EstadoPedido } from '@prisma/client';
import { TipoItemCarrito } from '@/lib/types/carrito';
import { setGuestOrderAuthCookie } from '@/lib/security/guestOrderAuth';
import {
  verificarTokenCotizacion,
  compararCotizacionConLiquidacion,
  generarTokenCotizacion,
  getGuestSessionId,
  DiferenciaCotizacion,
} from '@/lib/services/cotizacion';

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
  cotizacionToken?: string;
  guestSessionIdOverride?: string;
}

export interface ConfirmarPedidoResultado {
  success: boolean;
  error?: string;
  itemsRemovidosIds?: string[];
  pedidoId?: string;
  numeroPedido?: number;
  whatsappUrl?: string;
  requiereAceptacionCotizacion?: boolean;
  cotizacionActualizadaToken?: string;
  diferenciasCotizacion?: DiferenciaCotizacion[];
  importesActualizados?: {
    subtotalGeneral: number;
    subtotalProductos: number;
    subtotalPacks: number;
    descuento: any;
    totalFinal: number;
    tipoPrecio: 'PUBLICO' | 'PROFESIONAL';
  };
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
 * 1. Exige obligatoriamente una cotización verificable mediante cotizacionToken (firmada con HMAC-SHA256).
 * 2. Ejecuta la validación, cálculo y persistencia dentro de una transacción PostgreSQL (prisma.$transaction).
 * 3. Para clientes registrados, adquiere un lock transaccional exclusivo (pg_advisory_xact_lock) para evitar carreras en primera compra.
 * 4. Recalcula los importes y los compara exhaustivamente contra la cotización aprobada.
 * 5. Si hay cualquier discrepancia comercial, aborta la transacción y devuelve la cotización actualizada.
 * 6. Si coincide, persiste Pedido y PedidoItem atómicamente y genera el mensaje de WhatsApp.
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

    // 1. Validación obligatoria de cotización aceptada
    if (!opciones?.cotizacionToken || typeof opciones.cotizacionToken !== 'string' || opciones.cotizacionToken.trim() === '') {
      return {
        success: false,
        error: 'Es necesario contar con una cotización vigente de tu carrito para confirmar el pedido. Por favor revisá tu carrito antes de continuar.',
        requiereAceptacionCotizacion: true,
      };
    }

    const verif = verificarTokenCotizacion(opciones.cotizacionToken);
    if (!verif.valid || !verif.payload) {
      return {
        success: false,
        error: verif.error || 'La cotización enviada es inválida o ha sido alterada. Por favor actualizá tu carrito.',
        requiereAceptacionCotizacion: true,
      };
    }
    const cotizacionPayload = verif.payload;

    // 2. Obtener cliente autenticado en el servidor
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

    // 3. Identificación y datos obligatorios de invitados
    let guestSessionId: string | null = null;
    if (!cliente) {
      const cookieSessionId = await getGuestSessionId();
      guestSessionId = cookieSessionId || opciones?.guestSessionIdOverride || null;

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

    // 4. Validar formato estricto de ítems
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

    // 5. Ejecución atómica y serializada en PostgreSQL
    let pedidoGuardado: any = null;

    try {
      pedidoGuardado = await prisma.$transaction(
        async (tx) => {
          // A. Timeout local de 5 segundos para prevenir bloqueos infinitos
          await tx.$executeRaw`SET LOCAL lock_timeout = '5000'`;

          // B. Bloqueo transaccional exclusivo por cliente registrado (coordinado en PostgreSQL)
          if (cliente?.id) {
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('steffen_cliente_pedido'), hashtext(${cliente.id}))`;
          }

          // C. Liquidar el carrito con datos frescos dentro de la transacción
          const liquidacion = await liquidarCarrito(itemsCliente, cliente, {
            modo: 'CONFIRMACION',
            prismaClient: tx,
          });

          if (!liquidacion.esValidoParaConfirmar) {
            const errVal: any = new Error(liquidacion.errorConfirmacion || 'Uno o más productos ya no están disponibles.');
            errVal.esErrorValidacion = true;
            errVal.itemsRemovidosIds = liquidacion.itemsRemovidosIds.map((it) => it.id);
            throw errVal;
          }

          if (liquidacion.itemsValidos.length === 0) {
            const errVacio: any = new Error('El carrito no contiene productos válidos para confirmar.');
            errVacio.esErrorValidacion = true;
            throw errVacio;
          }

          // D. Comparación exhaustiva contra la cotización aprobada
          const comparacion = compararCotizacionConLiquidacion({
            cotizacion: cotizacionPayload,
            liquidacion,
            cliente,
            guestSessionId,
          });

          if (!comparacion.coincide) {
            const nuevaCotizacionToken = generarTokenCotizacion({
              liquidacion,
              clienteId: cliente?.id || null,
              guestSessionId: !cliente ? guestSessionId : null,
            });

            const errDiscrepancia: any = new Error(comparacion.motivo || 'Los importes de tu carrito han cambiado.');
            errDiscrepancia.esDiscrepanciaCotizacion = true;
            errDiscrepancia.nuevaCotizacion = nuevaCotizacionToken;
            errDiscrepancia.diferencias = comparacion.diferencias;
            errDiscrepancia.importesActualizados = {
              subtotalGeneral: liquidacion.subtotalGeneral,
              subtotalProductos: liquidacion.subtotalProductos,
              subtotalPacks: liquidacion.subtotalPacks,
              descuento: liquidacion.descuento,
              totalFinal: liquidacion.totalFinal,
              tipoPrecio: liquidacion.tipoPrecio,
            };
            throw errDiscrepancia;
          }

          // E. Persistencia del Pedido y PedidoItems
          let clienteIdParaPedido: string | null = cliente ? cliente.id : null;

          if (!clienteIdParaPedido) {
            let clienteInvitado = await tx.cliente.findFirst({
              where: { email: 'invitado@steffen.com' },
            });

            if (!clienteInvitado) {
              clienteInvitado = await tx.cliente.create({
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
          }

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
        },
        {
          timeout: 10000,
        }
      );
    } catch (errTx: any) {
      if (errTx?.esDiscrepanciaCotizacion) {
        return {
          success: false,
          error: `Los precios, descuentos o productos de tu carrito han cambiado (${errTx.message}). Por favor revisá los importes actualizados antes de confirmar.`,
          requiereAceptacionCotizacion: true,
          cotizacionActualizadaToken: errTx.nuevaCotizacion,
          diferenciasCotizacion: errTx.diferencias,
          importesActualizados: errTx.importesActualizados,
        };
      }

      if (errTx?.esErrorValidacion) {
        return {
          success: false,
          error: errTx.message,
          itemsRemovidosIds: errTx.itemsRemovidosIds,
        };
      }

      const errStr = String(errTx);
      if (errStr.includes('55P03') || errStr.toLowerCase().includes('lock timeout')) {
        return {
          success: false,
          error: 'El servidor está procesando otra operación para tu cuenta. Por favor intentá nuevamente en unos momentos.',
        };
      }

      console.error('Error durante la transacción de confirmación:', errTx);
      return {
        success: false,
        error: 'No se pudo procesar la confirmación del pedido. Por favor intentá nuevamente.',
      };
    }

    if (pedidoGuardado) {
      // Para pedidos de invitados, emitir cookie HttpOnly firmada
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

    return {
      success: false,
      error: 'No fue posible registrar el pedido. Por favor intentá nuevamente.',
    };
  } catch (error) {
    console.error('Error al confirmar y procesar el pedido:', error);
    return {
      success: false,
      error: 'Hubo un error al procesar el pedido. Por favor intentá nuevamente.',
    };
  }
}

