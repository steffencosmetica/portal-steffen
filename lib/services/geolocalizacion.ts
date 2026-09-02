import { prisma } from '@/lib/prisma';
import { Zona, Distribuidor } from '@prisma/client';

export type ZonaConDistribuidor = Zona & {
  distribuidor?: Distribuidor | null;
  distanciaKm?: number;
};

const RADIO_MAXIMO_KM = 50;

/**
 * Calcula la distancia ortodrómica en kilómetros entre dos coordenadas geográficas
 * utilizando la fórmula de Haversine (radio medio terrestre = 6371 km).
 */
export function calcularDistanciaHaversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radio de la Tierra en km
  const toRad = (grados: number) => (grados * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const radLat1 = toRad(lat1);
  const radLat2 = toRad(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Busca entre todas las Zonas geolocalizadas la más cercana a las coordenadas provistas.
 * Si la zona más cercana se encuentra a 50 km o menos, se retorna dicha Zona con su Distribuidor.
 * Si ninguna zona está en el radio de 50 km o no hay zonas geolocalizadas, retorna null.
 */
export async function encontrarZonaMasCercana(
  lat: number,
  lng: number,
  radioMaxKm: number = RADIO_MAXIMO_KM
): Promise<ZonaConDistribuidor | null> {
  if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
    return null;
  }

  // Obtener todas las zonas que tengan coordenadas cargadas
  const zonasConCoordenadas = await prisma.zona.findMany({
    where: {
      latitud: { not: null },
      longitud: { not: null },
    },
    include: {
      distribuidor: true,
    },
  });

  if (zonasConCoordenadas.length === 0) {
    return null;
  }

  let zonaMasCercana: ZonaConDistribuidor | null = null;
  let menorDistancia = Infinity;

  for (const zona of zonasConCoordenadas) {
    if (zona.latitud === null || zona.longitud === null) continue;

    const distancia = calcularDistanciaHaversineKm(
      lat,
      lng,
      zona.latitud,
      zona.longitud
    );

    if (distancia < menorDistancia) {
      menorDistancia = distancia;
      zonaMasCercana = {
        ...zona,
        distanciaKm: Math.round(distancia * 10) / 10,
      };
    }
  }

  // Si la zona más cercana está dentro del radio permitido (<= 50km), la retornamos
  if (zonaMasCercana && menorDistancia <= radioMaxKm) {
    return zonaMasCercana;
  }

  return null;
}
