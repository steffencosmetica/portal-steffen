'use server';

import { obtenerNumeroWhatsapp, generarUrlWhatsapp } from '@/lib/whatsapp';

/**
 * Retorna la URL de WhatsApp configurada en el servidor para contacto general
 */
export async function obtenerWhatsappContactoUrlAction(
  mensajePersonalizado?: string
): Promise<string> {
  const mensaje =
    mensajePersonalizado ||
    'Hola Steffen! Quisiera hacer una consulta sobre los productos y pedidos en el portal profesional.';

  return generarUrlWhatsapp(mensaje);
}
