/**
 * Configuración unificada de la política oficial de envíos del Portal Profesional Steffen.
 * 
 * Reglas Comerciales Oficiales:
 * 1. Si el TOTAL FINAL del pedido es >= $250.000 (después de descuentos, sumando productos y packs),
 *    el envío está 100% bonificado por Steffen.
 * 2. Si el total final es < $250.000, el costo del envío será informado y coordinado por WhatsApp.
 * 3. Esta política aplica a todos los pedidos del portal (visitantes, registrados con o sin distribuidor).
 * 4. El portal no calcula flete ni añade cargos de envío a los pedidos.
 */

export const UMBRAL_ENVIO_GRATIS = 250000;

export function calificaParaEnvioGratis(totalFinal: number): boolean {
  return totalFinal >= UMBRAL_ENVIO_GRATIS;
}

export const MENSAJES_ENVIO = {
  GRATIS: '¡Tu pedido tiene envío gratis! Steffen bonifica el costo del envío.',
  A_COORDINAR: 'El costo del envío se informará y coordinará por WhatsApp.',
  WHATSAPP_SECCION_GRATIS: 'GRATIS — Bonificado por Steffen al superar los $250.000.',
  WHATSAPP_SECCION_A_COORDINAR: 'El costo del envío será informado y coordinado por WhatsApp.',
} as const;
