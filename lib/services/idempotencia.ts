import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { ConfirmarPedidoItemInput, DatosInvitadoInput, ConfirmarPedidoResultado } from '@/app/actions/pedido';
import { generarUrlWhatsapp, obtenerNumeroWhatsappOFallar } from '@/lib/whatsapp';

/**
 * Valida si un string cumple el formato estándar de UUID v4.
 */
export function esUuidValido(valor: unknown): valor is string {
  if (typeof valor !== 'string') return false;
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return regex.test(valor.trim());
}

/**
 * Genera el hash canónico SHA-256 de los datos que definen la identidad de un intento de confirmación:
 * - Ítems ordenados de forma determinística (tipo, id, variante, cantidad).
 * - Identificador del comprador (clienteId o guestSessionId).
 * - Datos de contacto de invitados.
 * - Token o cotización aceptada.
 */
export function calcularPayloadHash(params: {
  items: ConfirmarPedidoItemInput[];
  clienteId: string | null;
  guestSessionId: string | null;
  datosInvitado?: DatosInvitadoInput | null;
  cotizacionToken?: string | null;
}): string {
  // Ordenar items de forma determinística
  const itemsOrdenados = [...params.items]
    .map((it) => ({
      id: it.id.trim(),
      tipo: it.tipo,
      variante: it.variante ? it.variante.trim() : null,
      cantidad: it.cantidad,
    }))
    .sort((a, b) => {
      const compTipo = a.tipo.localeCompare(b.tipo);
      if (compTipo !== 0) return compTipo;
      const compId = a.id.localeCompare(b.id);
      if (compId !== 0) return compId;
      return (a.variante || '').localeCompare(b.variante || '');
    });

  const datosInvitadoCanónicos = params.datosInvitado
    ? {
        nombre: (params.datosInvitado.nombre || '').trim().toLowerCase(),
        salon: (params.datosInvitado.salon || '').trim().toLowerCase(),
        telefono: (params.datosInvitado.telefono || '').trim(),
        localidad: (params.datosInvitado.localidad || '').trim().toLowerCase(),
        provincia: (params.datosInvitado.provincia || '').trim().toLowerCase(),
      }
    : null;

  const objetoCanonico = {
    items: itemsOrdenados,
    clienteId: params.clienteId || null,
    guestSessionId: params.guestSessionId || null,
    datosInvitado: datosInvitadoCanónicos,
    cotizacionToken: params.cotizacionToken ? params.cotizacionToken.trim() : null,
  };

  const jsonString = JSON.stringify(objetoCanonico);
  return crypto.createHash('sha256').update(jsonString).digest('hex');
}

/**
 * Reconstruye el resultado de confirmación a partir del registro o del Pedido si el caché JSON fue depurado.
 */
export function reconstruirResultadoDesdePedido(registro: any): ConfirmarPedidoResultado {
  if (registro.resultadoJson) {
    try {
      const parsed = JSON.parse(registro.resultadoJson);
      return parsed;
    } catch (e) {
      console.warn('Error parseando resultadoJson en idempotencia, reconstruyendo desde Pedido:', e);
    }
  }

  const pedido = registro.pedido;
  if (!pedido) {
    return {
      success: false,
      error: 'No se encontró el pedido vinculado a la clave de idempotencia.',
    };
  }

  let numeroWhatsapp: string;
  try {
    numeroWhatsapp = obtenerNumeroWhatsappOFallar();
  } catch {
    numeroWhatsapp = '+5491112345678';
  }

  const whatsappUrl = pedido.mensajeWhatsappGenerado
    ? generarUrlWhatsapp(numeroWhatsapp, pedido.mensajeWhatsappGenerado)
    : '';

  return {
    success: true,
    pedidoId: pedido.id,
    numeroPedido: pedido.numeroPedido,
    whatsappUrl,
  };
}

/**
 * Valida la autorización de acceso y la integridad del contenido para la recuperación idempotente.
 */
export function validarAccesoIdempotente(
  registro: any,
  params: {
    clienteId: string | null;
    guestSessionId: string | null;
    payloadHash: string;
  }
): { autorizado: boolean; error?: string } {
  // 1. Validar identidad del comprador
  if (registro.clienteId) {
    if (!params.clienteId || registro.clienteId !== params.clienteId) {
      return {
        autorizado: false,
        error: 'No tenés autorización para acceder a este pedido.',
      };
    }
  } else if (registro.guestSessionId) {
    if (!params.guestSessionId || registro.guestSessionId !== params.guestSessionId) {
      return {
        autorizado: false,
        error: 'No tenés autorización para acceder a este pedido de invitado.',
      };
    }
  }

  // 2. Validar que la clave no se haya usado para un contenido modificado
  if (registro.payloadHash !== params.payloadHash) {
    return {
      autorizado: false,
      error: 'La clave de confirmación ya fue utilizada para una solicitud con contenido o cotización diferente.',
    };
  }

  return { autorizado: true };
}

/**
 * Ejecutor con reintento ante errores transitorios de concurrencia de base de datos
 * (Deadlocks 40P01, lock timeout 55P03, serialización 40001).
 */
export async function ejecutarConReintentoTransaccional<T>(
  operacion: () => Promise<T>,
  maxIntentos: number = 2
): Promise<T> {
  let intento = 0;
  while (true) {
    try {
      intento++;
      return await operacion();
    } catch (error: any) {
      const codigoErrorPg = error?.meta?.code || error?.code || '';
      const mensaje = error?.message || '';

      const esErrorTransitorio =
        codigoErrorPg === '40P01' || // deadlock_detected
        codigoErrorPg === '55P03' || // lock_not_available
        codigoErrorPg === '40001' || // serialization_failure
        mensaje.includes('deadlock detected') ||
        mensaje.includes('canceling statement due to lock timeout') ||
        mensaje.includes('could not serialize access');

      if (esErrorTransitorio && intento <= maxIntentos) {
        // Backoff exponencial con jitter aleatorio
        const delayMs = Math.min(300, 50 * Math.pow(2, intento - 1) + Math.floor(Math.random() * 40));
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }

      throw error;
    }
  }
}
