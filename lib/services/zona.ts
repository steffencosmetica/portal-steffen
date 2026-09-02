export type EstadoZonaType = 'SIN_DISTRIBUIDOR' | 'COBERTURA_PARCIAL' | 'CON_DISTRIBUIDOR';

export interface EvaluacionZonaResult {
  estado: EstadoZonaType;
  permiteCompraDirectaFabrica: boolean;
  requiereContactoDistribuidor: boolean;
  mensajeInformativo: string;
}

export function evaluarAccesoZona(estadoZona?: EstadoZonaType | null): EvaluacionZonaResult {
  const estado = estadoZona || 'SIN_DISTRIBUIDOR';

  switch (estado) {
    case 'SIN_DISTRIBUIDOR':
      return {
        estado: 'SIN_DISTRIBUIDOR',
        permiteCompraDirectaFabrica: true,
        requiereContactoDistribuidor: false,
        mensajeInformativo:
          '¡Tu salón se encuentra en una zona con atención directa de fábrica Steffen! Accedés a precios profesionales y beneficios exclusivos.',
      };

    case 'COBERTURA_PARCIAL':
      return {
        estado: 'COBERTURA_PARCIAL',
        permiteCompraDirectaFabrica: true,
        requiereContactoDistribuidor: false,
        mensajeInformativo:
          'Tu zona cuenta con cobertura compartida. Podés realizar tu pedido directo por este portal oficial o solicitar contacto de distribuidor de zona.',
      };

    case 'CON_DISTRIBUIDOR':
      return {
        estado: 'CON_DISTRIBUIDOR',
        permiteCompraDirectaFabrica: false,
        requiereContactoDistribuidor: true,
        mensajeInformativo:
          'Tu localidad cuenta con un distribuidor oficial exclusivo de Steffen. Te derivaremos con tu representante para una atención personalizada y entrega inmediata.',
      };

    default:
      return {
        estado: 'SIN_DISTRIBUIDOR',
        permiteCompraDirectaFabrica: true,
        requiereContactoDistribuidor: false,
        mensajeInformativo: 'Acceso directo de fábrica habilitado.',
      };
  }
}
