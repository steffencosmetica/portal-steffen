import crypto from 'crypto';
import { cookies } from 'next/headers';

export const GUEST_ORDER_COOKIE_NAME = 'steffen_guest_order_auth';
export const GUEST_ORDER_MAX_AGE_SECONDS = 2 * 60 * 60; // 2 horas (7200 segundos)
export const MAX_STORED_GUEST_ORDERS = 10;

export interface GuestOrderEntry {
  pedidoId: string;
  exp: number; // Unix timestamp en milisegundos
}

export type GuestOrderAuthReason = 'valid' | 'expired' | 'invalid' | 'missing';

export interface GuestOrderAuthResult {
  authorized: boolean;
  reason: GuestOrderAuthReason;
}

/**
 * Obtiene la clave secreta para la firma criptográfica HMAC-SHA256.
 * Utiliza estrictamente GUEST_ORDER_SECRET y nunca reutiliza SUPABASE_SERVICE_ROLE_KEY.
 */
export function getGuestOrderSecret(): string {
  const secret = process.env.GUEST_ORDER_SECRET?.trim();
  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('GUEST_ORDER_SECRET no está configurada en las variables de entorno de producción.');
  }

  // Fallback de desarrollo para prevenir bloqueos si la variable no estuviera cargada
  return '35d406809b615671bf5612fa132d8c72730a0ee91edc753e68a18e14f969711b';
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
 * Firma los datos en base64url utilizando HMAC-SHA256 con el secreto configurado.
 */
function signPayload(payloadBase64Url: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payloadBase64Url).digest('hex');
}

/**
 * Parsea y valida un token de pedidos de invitados.
 * Devuelve únicamente las entradas vigentes y autenticadas.
 */
export function parseAndVerifyGuestToken(
  tokenString: string | undefined | null,
  secretOverride?: string
): GuestOrderEntry[] {
  if (!tokenString || typeof tokenString !== 'string') {
    return [];
  }

  const parts = tokenString.split('.');
  if (parts.length !== 2) {
    return [];
  }

  const [payloadBase64Url, signatureHex] = parts;
  const secret = secretOverride || getGuestOrderSecret();
  const expectedSignature = signPayload(payloadBase64Url, secret);

  if (!timingSafeEqualStrings(signatureHex, expectedSignature)) {
    return [];
  }

  try {
    const jsonStr = Buffer.from(payloadBase64Url, 'base64url').toString('utf8');
    const parsed = JSON.parse(jsonStr);

    if (!Array.isArray(parsed)) {
      return [];
    }

    const now = Date.now();
    return parsed.filter(
      (entry): entry is GuestOrderEntry =>
        entry &&
        typeof entry.pedidoId === 'string' &&
        typeof entry.exp === 'number' &&
        entry.exp > now
    );
  } catch {
    return [];
  }
}

/**
 * Verifica si un pedidoId específico está autorizado en el token recibido.
 * Distingue entre token faltante, inválido/adulterado, expirado o válido.
 */
export function checkGuestOrderAuthorization(
  pedidoId: string,
  tokenString: string | undefined | null,
  secretOverride?: string
): GuestOrderAuthResult {
  if (!pedidoId) {
    return { authorized: false, reason: 'invalid' };
  }

  if (!tokenString || typeof tokenString !== 'string' || tokenString.trim() === '') {
    return { authorized: false, reason: 'missing' };
  }

  const parts = tokenString.split('.');
  if (parts.length !== 2) {
    return { authorized: false, reason: 'invalid' };
  }

  const [payloadBase64Url, signatureHex] = parts;
  const secret = secretOverride || getGuestOrderSecret();
  const expectedSignature = signPayload(payloadBase64Url, secret);

  if (!timingSafeEqualStrings(signatureHex, expectedSignature)) {
    return { authorized: false, reason: 'invalid' };
  }

  try {
    const jsonStr = Buffer.from(payloadBase64Url, 'base64url').toString('utf8');
    const parsed = JSON.parse(jsonStr);

    if (!Array.isArray(parsed)) {
      return { authorized: false, reason: 'invalid' };
    }

    const orderEntry = parsed.find(
      (entry): entry is GuestOrderEntry =>
        entry && typeof entry.pedidoId === 'string' && entry.pedidoId === pedidoId
    );

    if (!orderEntry) {
      return { authorized: false, reason: 'invalid' };
    }

    if (orderEntry.exp <= Date.now()) {
      return { authorized: false, reason: 'expired' };
    }

    return { authorized: true, reason: 'valid' };
  } catch {
    return { authorized: false, reason: 'invalid' };
  }
}

/**
 * Genera un nuevo token firmado conteniendo el nuevo pedido autorizado
 * y preservando pedidos vigentes anteriores (hasta MAX_STORED_GUEST_ORDERS).
 */
export function generateGuestOrderToken(
  newPedidoId: string,
  currentTokenString?: string | null,
  secretOverride?: string,
  customTtlSeconds: number = GUEST_ORDER_MAX_AGE_SECONDS
): string {
  const secret = secretOverride || getGuestOrderSecret();
  const existingEntries = parseAndVerifyGuestToken(currentTokenString, secret);

  // Filtrar si ya existía para actualizar expiración
  const filtered = existingEntries.filter((e) => e.pedidoId !== newPedidoId);

  // Agregar nueva entrada
  const newEntry: GuestOrderEntry = {
    pedidoId: newPedidoId,
    exp: Date.now() + customTtlSeconds * 1000,
  };

  const updatedEntries = [...filtered, newEntry].slice(-MAX_STORED_GUEST_ORDERS);

  const payloadJson = JSON.stringify(updatedEntries);
  const payloadBase64Url = Buffer.from(payloadJson, 'utf8').toString('base64url');
  const signatureHex = signPayload(payloadBase64Url, secret);

  return `${payloadBase64Url}.${signatureHex}`;
}

/**
 * Establece la cookie HttpOnly firmada en el cliente desde una Server Action o Route Handler.
 * Utiliza path: '/' para permitir su lectura desde /carrito al acumular pedidos consecutivos
 * y purga cualquier cookie remanente del path anterior '/pedido-enviado'.
 */
export async function setGuestOrderAuthCookie(pedidoId: string): Promise<void> {
  const cookieStore = await cookies();
  const currentToken = cookieStore.get(GUEST_ORDER_COOKIE_NAME)?.value;
  const newToken = generateGuestOrderToken(pedidoId, currentToken);

  // Purgar cookie previa del path antiguo si existiera en el navegador
  cookieStore.set(GUEST_ORDER_COOKIE_NAME, '', {
    path: '/pedido-enviado',
    maxAge: 0,
  });

  // Establecer cookie con path: '/'
  cookieStore.set(GUEST_ORDER_COOKIE_NAME, newToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: GUEST_ORDER_MAX_AGE_SECONDS,
  });
}

/**
 * Lee y verifica la autorización de la cookie HttpOnly en el request actual.
 */
export async function verifyGuestOrderCookieFromRequest(pedidoId: string): Promise<GuestOrderAuthResult> {
  const cookieStore = await cookies();
  const currentToken = cookieStore.get(GUEST_ORDER_COOKIE_NAME)?.value;
  return checkGuestOrderAuthorization(pedidoId, currentToken);
}
