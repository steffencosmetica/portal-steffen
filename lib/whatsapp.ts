/**
 * Helper centralizado para la configuración y generación de enlaces de WhatsApp.
 * Normaliza el número al formato internacional de WhatsApp (E.164 para Argentina: 549...).
 */

// Número por defecto de atención y pedidos de Steffen Oficial
const NUMERO_STEFFEN_DEFAULT = '5492235590428';

/**
 * Normaliza un número de teléfono para la API de WhatsApp.
 * Si es un número argentino (ej: 2235590428, 11..., 54223...), se asegura de que tenga el formato 549...
 */
export function normalizarNumeroWhatsapp(rawNumero?: string | null): string {
  if (!rawNumero) return NUMERO_STEFFEN_DEFAULT;
  const digits = rawNumero.replace(/\D/g, '');
  if (!digits) return NUMERO_STEFFEN_DEFAULT;

  // Si ya empieza con 549 y tiene longitud completa (ej. 5492235590428)
  if (digits.startsWith('549') && digits.length >= 12) {
    return digits;
  }

  // Si empieza con 54 pero no tiene el 9 (ej. 542235590428)
  if (digits.startsWith('54') && !digits.startsWith('549') && digits.length >= 10) {
    return `549${digits.slice(2)}`;
  }

  // Si es un número nacional con código de área (ej. 2235590428 o 11...)
  if (digits.length === 10) {
    return `549${digits}`;
  }

  // Si empieza con 0 o 15 (formatos locales tradicionales argentinos)
  let sinPrefijo = digits;
  if (sinPrefijo.startsWith('0')) {
    sinPrefijo = sinPrefijo.slice(1);
  }
  if (sinPrefijo.length === 10) {
    return `549${sinPrefijo}`;
  }

  // Por defecto, si tiene al menos 8 dígitos nacionales, anteponer 549
  if (digits.length >= 8 && !digits.startsWith('54')) {
    return `549${digits}`;
  }

  return digits;
}

export class ConfiguracionWhatsappError extends Error {
  constructor(mensaje = 'No se pudo determinar el número de WhatsApp oficial de Steffen.') {
    super(mensaje);
    this.name = 'ConfiguracionWhatsappError';
  }
}

/**
 * Obtiene el número de WhatsApp para pedidos configurado en las variables de entorno
 * o fallback al número oficial de Steffen.
 */
export function obtenerNumeroWhatsappOFallar(): string {
  const envNum = process.env.WHATSAPP_NUMERO_PEDIDOS?.trim();
  return normalizarNumeroWhatsapp(envNum || NUMERO_STEFFEN_DEFAULT);
}

/**
 * Obtiene el número de WhatsApp de manera segura normalizado.
 */
export function obtenerNumeroWhatsapp(): string {
  const envNum = process.env.WHATSAPP_NUMERO_PEDIDOS?.trim();
  return normalizarNumeroWhatsapp(envNum || NUMERO_STEFFEN_DEFAULT);
}

/**
 * Construye la URL oficial de WhatsApp con el número destinatario y el texto pre-formateado.
 */
export function generarUrlWhatsapp(mensaje: string, numeroDestino?: string | null): string {
  const numero = numeroDestino ? normalizarNumeroWhatsapp(numeroDestino) : obtenerNumeroWhatsapp();
  const textoCodificado = encodeURIComponent(mensaje || '');
  return `https://api.whatsapp.com/send?phone=${numero}&text=${textoCodificado}`;
}


