// Validación de destinos de redirección recibidos desde la URL o formularios (?next=, ?redirect=).
// Solo se aceptan rutas internas del propio portal para evitar redirecciones abiertas hacia dominios externos.

const ORIGEN_INTERNO = 'http://portal.interno';
const LONGITUD_MAXIMA_DESTINO = 2048;

/**
 * Devuelve el destino normalizado (pathname + query + hash) si es una ruta interna segura,
 * o null si apunta (o podría ser interpretado por el navegador como) un destino externo.
 *
 * Rechaza:
 * - URLs absolutas (https://..., javascript:..., data:...).
 * - URLs relativas al protocolo (//dominio.com) y variantes con barra invertida (/\dominio.com),
 *   que los navegadores normalizan como //dominio.com.
 * - Caracteres de control (tabs, saltos de línea), que el parser de URL descarta y permiten evadir filtros.
 */
export function obtenerRutaInternaSegura(destino: unknown): string | null {
  if (typeof destino !== 'string') {
    return null;
  }

  const candidato = destino.trim();

  if (!candidato || candidato.length > LONGITUD_MAXIMA_DESTINO) {
    return null;
  }

  if (!candidato.startsWith('/') || candidato.startsWith('//') || candidato.includes('\\')) {
    return null;
  }

  if (/[\u0000-\u001F\u007F]/.test(candidato)) {
    return null;
  }

  try {
    const url = new URL(candidato, ORIGEN_INTERNO);
    if (url.origin !== ORIGEN_INTERNO || url.pathname.startsWith('//')) {
      return null;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

/**
 * Igual que obtenerRutaInternaSegura, pero devuelve la ruta por defecto si el destino no es seguro.
 */
export function resolverRutaInternaSegura(destino: unknown, rutaPorDefecto: string): string {
  return obtenerRutaInternaSegura(destino) ?? rutaPorDefecto;
}
