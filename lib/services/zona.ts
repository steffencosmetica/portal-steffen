export type EstadoZonaType = 'SIN_DISTRIBUIDOR' | 'COBERTURA_PARCIAL' | 'CON_DISTRIBUIDOR';

export interface EvaluacionZonaResult {
  estado: EstadoZonaType;
  permiteCompraDirectaFabrica: boolean;
  requiereContactoDistribuidor: boolean;
  mensajeInformativo: string;
}

/**
 * Evalúa las condiciones comerciales y de visualización según la zona geográfica.
 * Regla de negocio Steffen:
 * - Todos los usuarios pueden comprar directamente desde el portal.
 * - La existencia de un distribuidor NO bloquea la compra ni el carrito.
 * - permiteCompraDirectaFabrica es true en todos los casos.
 * - requiereContactoDistribuidor es false (el contacto es opcional).
 * - En zonas con distribuidor se presenta un aviso informativo con opción de contacto comercial.
 */
export function evaluarAccesoZona(estadoZona?: EstadoZonaType | null): EvaluacionZonaResult {
  if (estadoZona === 'CON_DISTRIBUIDOR') {
    return {
      estado: 'CON_DISTRIBUIDOR',
      permiteCompraDirectaFabrica: true,
      requiereContactoDistribuidor: false,
      mensajeInformativo:
        'Tu localidad cuenta con un distribuidor oficial Steffen. Podés coordinar con tu representante o continuar con tu pedido directo por este portal oficial.',
    };
  }

  return {
    estado: estadoZona === 'COBERTURA_PARCIAL' ? 'COBERTURA_PARCIAL' : 'SIN_DISTRIBUIDOR',
    permiteCompraDirectaFabrica: true,
    requiereContactoDistribuidor: false,
    mensajeInformativo:
      '¡Tu salón se encuentra en una zona con atención directa de fábrica Steffen! Accedés a precios profesionales y beneficios exclusivos.',
  };
}
