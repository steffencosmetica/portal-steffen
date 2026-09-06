import { prisma } from '@/lib/prisma';
import { Zona, Distribuidor } from '@prisma/client';

export type ZonaConDistribuidor = Zona & {
  distribuidor?: Distribuidor | null;
  distanciaKm?: number;
};

export const RADIO_MAXIMO_KM = 10;

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
 * Si la zona más cercana se encuentra a 10 km o menos, se retorna dicha Zona con su Distribuidor.
 * Si ninguna zona está en el radio de 10 km o no hay zonas geolocalizadas, retorna null.
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

  // Si la zona más cercana está dentro del radio permitido (<= 10km), la retornamos
  if (zonaMasCercana && menorDistancia <= radioMaxKm) {
    return zonaMasCercana;
  }

  return null;
}

/**
 * Recalcula y actualiza la asignación de zonas para todos los clientes
 * utilizando el radio de 10 km para salones con GPS, o coincidencia de localidad/provincia.
 */
export async function recalcularAsignacionesZonas(radioKm: number = RADIO_MAXIMO_KM) {
  const zonas = await prisma.zona.findMany({
    include: {
      distribuidor: true,
    },
  });

  const zonasConGps = zonas.filter(
    (z) => z.latitud !== null && z.longitud !== null
  );

  const clientes = await prisma.cliente.findMany({
    select: {
      id: true,
      salon: true,
      provincia: true,
      localidad: true,
      latitud: true,
      longitud: true,
      zonaId: true,
    },
  });

  let reasignados = 0;
  let asignadosPorGps = 0;
  let sinCambios = 0;

  for (const cliente of clientes) {
    let nuevaZonaId: string | null = null;
    let fuePorGps = false;

    // 1. Si tiene coordenadas, buscar la zona más cercana dentro del radio (10 km)
    if (cliente.latitud !== null && cliente.longitud !== null && zonasConGps.length > 0) {
      let menorDistancia = Infinity;
      let zonaCercana: Zona | null = null;

      for (const zona of zonasConGps) {
        if (zona.latitud === null || zona.longitud === null) continue;
        const d = calcularDistanciaHaversineKm(
          cliente.latitud,
          cliente.longitud,
          zona.latitud,
          zona.longitud
        );
        if (d < menorDistancia) {
          menorDistancia = d;
          zonaCercana = zona;
        }
      }

      if (zonaCercana && menorDistancia <= radioKm) {
        nuevaZonaId = zonaCercana.id;
        fuePorGps = true;
      }
    }

    // 2. Si no tiene coordenadas (o quedó fuera de radio GPS pero su texto coincide con una zona)
    if (!nuevaZonaId && (!cliente.latitud || !cliente.longitud)) {
      const matchTexto = zonas.find(
        (z) =>
          z.provincia.trim().toLowerCase() === cliente.provincia.trim().toLowerCase() &&
          z.localidad.trim().toLowerCase() === cliente.localidad.trim().toLowerCase()
      );
      if (matchTexto) {
        nuevaZonaId = matchTexto.id;
      }
    }

    // Si cambió la zona
    if (nuevaZonaId !== cliente.zonaId) {
      await prisma.cliente.update({
        where: { id: cliente.id },
        data: { zonaId: nuevaZonaId },
      });
      reasignados++;
      if (fuePorGps) asignadosPorGps++;
    } else {
      sinCambios++;
      if (fuePorGps && nuevaZonaId) asignadosPorGps++;
    }
  }

  return {
    totalClientes: clientes.length,
    reasignados,
    asignadosPorGps,
    sinCambios,
    radioKm,
  };
}
