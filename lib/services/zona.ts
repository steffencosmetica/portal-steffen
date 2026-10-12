export type EstadoZonaType = 'SIN_DISTRIBUIDOR' | 'COBERTURA_PARCIAL' | 'CON_DISTRIBUIDOR';

export interface EvaluacionZonaResult {
  estado: EstadoZonaType;
  permiteCompraDirectaFabrica: boolean;
  requiereContactoDistribuidor: boolean;
  mensajeInformativo: string;
}

/**
 * Evalúa las condiciones comerciales según la zona geográfica.
 * En el nuevo sistema de distribución:
 * - Solo 'CON_DISTRIBUIDOR' deriva al distribuidor oficial exclusivo.
 * - 'SIN_DISTRIBUIDOR', 'COBERTURA_PARCIAL' (en desuso comercial), null o indefinido
 *   habilitan la compra directa de fábrica con beneficios profesionales.
 */
export function evaluarAccesoZona(estadoZona?: EstadoZonaType | null): EvaluacionZonaResult {
  if (estadoZona === 'CON_DISTRIBUIDOR') {
    return {
      estado: 'CON_DISTRIBUIDOR',
      permiteCompraDirectaFabrica: false,
      requiereContactoDistribuidor: true,
      mensajeInformativo:
        'Tu localidad cuenta con un distribuidor oficial exclusivo de Steffen. Te derivaremos con tu representante para una atención personalizada y entrega inmediata.',
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
