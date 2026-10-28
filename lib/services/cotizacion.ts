import crypto from 'crypto';
import { cookies } from 'next/headers';
import { LiquidacionCarritoResultado, ItemLiquidado } from './liquidacion';

export const NOMBRE_COOKIE_SESION_INVITADO = 'steffen_guest_session_id';
export const VERSION_COTIZACION = 1;
export const COTIZACION_TTL_MS = 15 * 60 * 1000; // 15 minutos

export interface ItemCotizacionResumen {
  id: string;
  tipo: 'PRODUCTO' | 'PACK';
  variante: string | null;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface PayloadCotizacion {
  v: number;
  cotizacionId: string;
  tipoComprador: 'CLIENTE' | 'INVITADO';
  clienteId: string | null;
  guestSessionId: string | null;
  tipoPrecio: 'PUBLICO' | 'PROFESIONAL';
  items: ItemCotizacionResumen[];
  subtotalProductos: number;
  subtotalPacks: number;
  subtotalGeneral: number;
  tipoDescuento: 'PRIMER_PEDIDO' | 'REPOSICION' | 'SIN_DESCUENTO';
  porcentajeDescuento: number;
  montoDescuento: number;
  totalFinal: number;
  emitidoEn: number;
  exp: number;
}

export interface VerificacionCotizacionResultado {
  valid: boolean;
  payload?: PayloadCotizacion;
  error?: string;
  motivoInvalido?: 'firma' | 'expirado' | 'formato' | 'version';
}

export interface DiferenciaCotizacion {
  campo: string;
  esperado: any;
  actual: any;
  descripcion: string;
}

export interface ComparacionCotizacionResultado {
  coincide: boolean;
  motivo?: string;
  diferencias: DiferenciaCotizacion[];
}

/**
 * Obtiene la clave secreta para la firma HMAC-SHA256 de cotizaciones.
 * Utiliza estrictamente COTIZACION_SECRET y nunca reutiliza GUEST_ORDER_SECRET.
 */
export function getCotizacionSecret(): string {
  const secret = process.env.COTIZACION_SECRET?.trim();
  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('COTIZACION_SECRET no está configurada en las variables de entorno de producción.');
  }

  // Clave exclusiva de fallback para desarrollo local
  return '9f4b7a1c8e3d2a5f6b0c1e4d8a7b9c2e5f8a1d4b7c0e3a6f9d2b5c8e1a4d7f0b';
}

/**
 * Comparación de cadenas de tiempo constante para prevenir timing attacks.
 */
function timingSafeEqualStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');

  if (bufA.length !== bufB.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Firma un payload en base64url con HMAC-SHA256.
 */
function signPayload(payloadBase64Url: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payloadBase64Url).digest('hex');
}

/**
 * Obtiene o crea el identificador seguro de sesión anónima de invitado mediante cookie HttpOnly.
 */
export async function getOrCreateGuestSessionId(): Promise<string> {
  try {
    const cookieStore = await cookies();
    const existing = cookieStore.get(NOMBRE_COOKIE_SESION_INVITADO)?.value;
    if (existing && existing.trim().length >= 16) {
      return existing.trim();
    }

    const newId = crypto.randomUUID();
    cookieStore.set(NOMBRE_COOKIE_SESION_INVITADO, newId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 días
    });
    return newId;
  } catch {
    // Si cookies() no está disponible en este contexto, generar un UUID en memoria
    return crypto.randomUUID();
  }
}

/**
 * Lee el identificador de sesión anónima de invitado sin crearlo.
 */
export async function getGuestSessionId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get(NOMBRE_COOKIE_SESION_INVITADO)?.value || null;
  } catch {
    return null;
  }
}

/**
 * Convierte los ítems liquidados en un resumen canónico ordenado.
 */
function mapearItemsCanónicos(itemsValidos: ItemLiquidado[]): ItemCotizacionResumen[] {
  return itemsValidos
    .map((item) => ({
      id: item.id,
      tipo: item.tipo,
      variante: item.variante || null,
      cantidad: item.cantidad,
      precioUnitario: item.precioUnitario,
      subtotal: item.subtotal,
    }))
    .sort((a, b) => {
      const keyA = `${a.id}_${a.variante || ''}`;
      const keyB = `${b.id}_${b.variante || ''}`;
      return keyA.localeCompare(keyB);
    });
}

/**
 * Genera un token firmado de cotización a partir de la liquidación del carrito.
 */
export function generarTokenCotizacion(params: {
  liquidacion: LiquidacionCarritoResultado;
  clienteId?: string | null;
  guestSessionId?: string | null;
  ttlMs?: number;
  secretOverride?: string;
}): string {
  const { liquidacion, clienteId, guestSessionId, ttlMs = COTIZACION_TTL_MS, secretOverride } = params;

  const now = Date.now();
  const payload: PayloadCotizacion = {
    v: VERSION_COTIZACION,
    cotizacionId: crypto.randomUUID(),
    tipoComprador: clienteId ? 'CLIENTE' : 'INVITADO',
    clienteId: clienteId || null,
    guestSessionId: clienteId ? null : (guestSessionId || null),
    tipoPrecio: liquidacion.tipoPrecio,
    items: mapearItemsCanónicos(liquidacion.itemsValidos),
    subtotalProductos: liquidacion.subtotalProductos,
    subtotalPacks: liquidacion.subtotalPacks,
    subtotalGeneral: liquidacion.subtotalGeneral,
    tipoDescuento: liquidacion.descuento.tipoAplicado,
    porcentajeDescuento: liquidacion.descuento.porcentaje,
    montoDescuento: liquidacion.descuento.montoDescuento,
    totalFinal: liquidacion.totalFinal,
    emitidoEn: now,
    exp: now + ttlMs,
  };

  const jsonStr = JSON.stringify(payload);
  const payloadBase64Url = Buffer.from(jsonStr, 'utf8').toString('base64url');
  const secret = secretOverride || getCotizacionSecret();
  const signatureHex = signPayload(payloadBase64Url, secret);

  return `${payloadBase64Url}.${signatureHex}`;
}

/**
 * Valida la firma HMAC, estructura y expiración de un token de cotización.
 */
export function verificarTokenCotizacion(
  tokenString: string | undefined | null,
  secretOverride?: string
): VerificacionCotizacionResultado {
  if (!tokenString || typeof tokenString !== 'string') {
    return { valid: false, error: 'Token de cotización no provisto', motivoInvalido: 'formato' };
  }

  const parts = tokenString.split('.');
  if (parts.length !== 2) {
    return { valid: false, error: 'Formato de token de cotización inválido', motivoInvalido: 'formato' };
  }

  const [payloadBase64Url, signatureHex] = parts;
  const secret = secretOverride || getCotizacionSecret();
  const expectedSignature = signPayload(payloadBase64Url, secret);

  if (!timingSafeEqualStrings(signatureHex, expectedSignature)) {
    return { valid: false, error: 'Firma de cotización inválida o token adulterado', motivoInvalido: 'firma' };
  }

  try {
    const jsonStr = Buffer.from(payloadBase64Url, 'base64url').toString('utf8');
    const parsed = JSON.parse(jsonStr) as PayloadCotizacion;

    if (!parsed || typeof parsed !== 'object' || parsed.v !== VERSION_COTIZACION) {
      return { valid: false, error: 'Versión de cotización no compatible', motivoInvalido: 'version' };
    }

    if (typeof parsed.exp !== 'number' || parsed.exp <= Date.now()) {
      return { valid: false, error: 'La cotización ha expirado', motivoInvalido: 'expirado', payload: parsed };
    }

    return { valid: true, payload: parsed };
  } catch {
    return { valid: false, error: 'Error al interpretar los datos de la cotización', motivoInvalido: 'formato' };
  }
}

/**
 * Compara minuciosamente una cotización aceptada contra una liquidación recalculada y la identidad del comprador.
 * Detecta alteraciones de precios, descuentos, composición de ítems, cantidades y usuario.
 */
export function compararCotizacionConLiquidacion(params: {
  cotizacion: PayloadCotizacion;
  liquidacion: LiquidacionCarritoResultado;
  cliente: { id: string } | null;
  guestSessionId: string | null;
}): ComparacionCotizacionResultado {
  const { cotizacion, liquidacion, cliente, guestSessionId } = params;
  const diferencias: DiferenciaCotizacion[] = [];

  // 1. Verificación de identidad
  if (cotizacion.tipoComprador === 'CLIENTE') {
    if (!cliente || cliente.id !== cotizacion.clienteId) {
      diferencias.push({
        campo: 'clienteId',
        esperado: cotizacion.clienteId,
        actual: cliente?.id || null,
        descripcion: 'La cotización pertenece a otro usuario registrado.',
      });
      return {
        coincide: false,
        motivo: 'La cotización no pertenece a la cuenta actual.',
        diferencias,
      };
    }
  } else {
    // Invitado
    if (cliente) {
      diferencias.push({
        campo: 'tipoComprador',
        esperado: 'INVITADO',
        actual: 'CLIENTE',
        descripcion: 'La cotización fue generada como invitado pero se intenta confirmar con usuario logueado.',
      });
      return {
        coincide: false,
        motivo: 'La cotización corresponde a una sesión de invitado previa.',
        diferencias,
      };
    }

    if (!cotizacion.guestSessionId || !guestSessionId || guestSessionId !== cotizacion.guestSessionId) {
      diferencias.push({
        campo: 'guestSessionId',
        esperado: cotizacion.guestSessionId,
        actual: guestSessionId,
        descripcion: 'La cotización corresponde a otra sesión de navegación invitada.',
      });
      return {
        coincide: false,
        motivo: 'La cotización no coincide con la sesión de invitado actual.',
        diferencias,
      };
    }
  }

  // 2. Verificación de tipo de precio
  if (cotizacion.tipoPrecio !== liquidacion.tipoPrecio) {
    diferencias.push({
      campo: 'tipoPrecio',
      esperado: cotizacion.tipoPrecio,
      actual: liquidacion.tipoPrecio,
      descripcion: `El tipo de precio cambió de ${cotizacion.tipoPrecio} a ${liquidacion.tipoPrecio}.`,
    });
  }

  // 3. Verificación de ítems (artículos, variantes, cantidades y precios unitarios)
  const itemsLiquidacion = mapearItemsCanónicos(liquidacion.itemsValidos);

  if (cotizacion.items.length !== itemsLiquidacion.length) {
    diferencias.push({
      campo: 'items.length',
      esperado: cotizacion.items.length,
      actual: itemsLiquidacion.length,
      descripcion: `La cantidad de productos en el carrito cambió de ${cotizacion.items.length} a ${itemsLiquidacion.length}.`,
    });
  } else {
    for (let i = 0; i < cotizacion.items.length; i++) {
      const itCot = cotizacion.items[i];
      const itLiq = itemsLiquidacion[i];

      if (itCot.id !== itLiq.id || itCot.tipo !== itLiq.tipo || itCot.variante !== itLiq.variante) {
        diferencias.push({
          campo: `item[${i}]`,
          esperado: `${itCot.tipo}:${itCot.id}:${itCot.variante || 'sin-variante'}`,
          actual: `${itLiq.tipo}:${itLiq.id}:${itLiq.variante || 'sin-variante'}`,
          descripcion: `El artículo en posición ${i + 1} no coincide con el cotizado.`,
        });
      }

      if (itCot.cantidad !== itLiq.cantidad) {
        diferencias.push({
          campo: `item[${i}].cantidad`,
          esperado: itCot.cantidad,
          actual: itLiq.cantidad,
          descripcion: `La cantidad para el ítem cambió de ${itCot.cantidad} a ${itLiq.cantidad}.`,
        });
      }

      if (Math.abs(itCot.precioUnitario - itLiq.precioUnitario) > 0.01) {
        diferencias.push({
          campo: `item[${i}].precioUnitario`,
          esperado: itCot.precioUnitario,
          actual: itLiq.precioUnitario,
          descripcion: `El precio unitario cambió de $${itCot.precioUnitario} a $${itLiq.precioUnitario}.`,
        });
      }

      if (Math.abs(itCot.subtotal - itLiq.subtotal) > 0.01) {
        diferencias.push({
          campo: `item[${i}].subtotal`,
          esperado: itCot.subtotal,
          actual: itLiq.subtotal,
          descripcion: `El subtotal del ítem cambió de $${itCot.subtotal} a $${itLiq.subtotal}.`,
        });
      }
    }
  }

  // 4. Verificación de subtotales
  if (Math.abs(cotizacion.subtotalProductos - liquidacion.subtotalProductos) > 0.01) {
    diferencias.push({
      campo: 'subtotalProductos',
      esperado: cotizacion.subtotalProductos,
      actual: liquidacion.subtotalProductos,
      descripcion: `El subtotal de productos cambió de $${cotizacion.subtotalProductos} a $${liquidacion.subtotalProductos}.`,
    });
  }

  if (Math.abs(cotizacion.subtotalPacks - liquidacion.subtotalPacks) > 0.01) {
    diferencias.push({
      campo: 'subtotalPacks',
      esperado: cotizacion.subtotalPacks,
      actual: liquidacion.subtotalPacks,
      descripcion: `El subtotal de packs cambió de $${cotizacion.subtotalPacks} a $${liquidacion.subtotalPacks}.`,
    });
  }

  if (Math.abs(cotizacion.subtotalGeneral - liquidacion.subtotalGeneral) > 0.01) {
    diferencias.push({
      campo: 'subtotalGeneral',
      esperado: cotizacion.subtotalGeneral,
      actual: liquidacion.subtotalGeneral,
      descripcion: `El subtotal general cambió de $${cotizacion.subtotalGeneral} a $${liquidacion.subtotalGeneral}.`,
    });
  }

  // 5. Verificación de descuentos
  if (cotizacion.tipoDescuento !== liquidacion.descuento.tipoAplicado) {
    diferencias.push({
      campo: 'tipoDescuento',
      esperado: cotizacion.tipoDescuento,
      actual: liquidacion.descuento.tipoAplicado,
      descripcion: `El tipo de descuento cambió de ${cotizacion.tipoDescuento} a ${liquidacion.descuento.tipoAplicado}.`,
    });
  }

  if (Math.abs(cotizacion.porcentajeDescuento - liquidacion.descuento.porcentaje) > 0.01) {
    diferencias.push({
      campo: 'porcentajeDescuento',
      esperado: cotizacion.porcentajeDescuento,
      actual: liquidacion.descuento.porcentaje,
      descripcion: `El porcentaje de descuento cambió de ${cotizacion.porcentajeDescuento}% a ${liquidacion.descuento.porcentaje}%.`,
    });
  }

  if (Math.abs(cotizacion.montoDescuento - liquidacion.descuento.montoDescuento) > 0.01) {
    diferencias.push({
      campo: 'montoDescuento',
      esperado: cotizacion.montoDescuento,
      actual: liquidacion.descuento.montoDescuento,
      descripcion: `El monto de descuento cambió de $${cotizacion.montoDescuento} a $${liquidacion.descuento.montoDescuento}.`,
    });
  }

  // 6. Verificación del total final
  if (Math.abs(cotizacion.totalFinal - liquidacion.totalFinal) > 0.01) {
    diferencias.push({
      campo: 'totalFinal',
      esperado: cotizacion.totalFinal,
      actual: liquidacion.totalFinal,
      descripcion: `El total final a pagar cambió de $${cotizacion.totalFinal} a $${liquidacion.totalFinal}.`,
    });
  }

  if (diferencias.length > 0) {
    const descripcionPrimera = diferencias[0].descripcion;
    return {
      coincide: false,
      motivo: descripcionPrimera,
      diferencias,
    };
  }

  return {
    coincide: true,
    diferencias: [],
  };
}
