import { prisma } from '@/lib/prisma';
import { Zona, Distribuidor } from '@prisma/client';

export type ZonaConDistribuidor = Zona & {
  distribuidor?: Distribuidor | null;
  distanciaKm?: number;
};

export const RADIO_COBERTURA_DISTRIBUIDOR_KM = 50;
export const RADIO_MAXIMO_KM = RADIO_COBERTURA_DISTRIBUIDOR_KM; // Alias para retrocompatibilidad

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
 * Busca entre todas las Zonas con Distribuidor ACTIVO la más cercana a las coordenadas provistas.
 * Si la zona más cercana se encuentra dentro del radio de cobertura (por defecto 50 km), se retorna
 * dicha Zona con su Distribuidor.
 * Si ninguna zona con distribuidor activo está en el radio o no hay zonas geolocalizadas, retorna null.
 * En caso de empate exacto de distancia, desempata de manera determinística por id de zona.
 */
export async function encontrarZonaMasCercana(
  lat: number,
  lng: number,
  radioMaxKm: number = RADIO_COBERTURA_DISTRIBUIDOR_KM
): Promise<ZonaConDistribuidor | null> {
  if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
    return null;
  }

  // Obtener todas las zonas que tengan coordenadas cargadas Y distribuidor ACTIVO
  const zonasConCoordenadas = await prisma.zona.findMany({
    where: {
      latitud: { not: null },
      longitud: { not: null },
      distribuidorId: { not: null },
      distribuidor: {
        estado: 'ACTIVO',
      },
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

    const esMenor = distancia < menorDistancia;
    const esEmpate = Math.abs(distancia - menorDistancia) < 1e-6;
    const ganaPorDesempate = esEmpate && zonaMasCercana !== null && zona.id < zonaMasCercana.id;

    if (esMenor || ganaPorDesempate) {
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

/**
 * Recalcula y actualiza la asignación de zonas para todos los clientes profesionales.
 * - Salones con GPS: busca la zona más cercana con distribuidor ACTIVO dentro del radio (50 km).
 *   Si está a > 50 km o no hay distribuidores activos en rango, asigna zonaId = null (SIN DISTRIBUIDOR).
 * - Salones SIN GPS: conserva asignaciones manuales existentes si la zona asignada existe y su
 *   distribuidor está ACTIVO. Si la zona no existe, no tiene distribuidor o su distribuidor está INACTIVO,
 *   se resetea zonaId = null. No se realiza asignación por coincidencia de texto.
 */
export async function recalcularAsignacionesZonas(radioKm: number = RADIO_COBERTURA_DISTRIBUIDOR_KM) {
  // 1. Zonas con coordenadas y distribuidor activo
  const zonasActivasConGps = await prisma.zona.findMany({
    where: {
      latitud: { not: null },
      longitud: { not: null },
      distribuidorId: { not: null },
      distribuidor: {
        estado: 'ACTIVO',
      },
    },
    include: {
      distribuidor: true,
    },
  });

  // 2. Todas las zonas para validar asignaciones previas de clientes sin GPS
  const todasLasZonas = await prisma.zona.findMany({
    include: {
      distribuidor: true,
    },
  });
  const zonasMap = new Map(todasLasZonas.map((z) => [z.id, z]));

  const clientes = await prisma.cliente.findMany({
    select: {
      id: true,
      salon: true,
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

    const tieneCoordenadas =
      typeof cliente.latitud === 'number' &&
      typeof cliente.longitud === 'number' &&
      !isNaN(cliente.latitud) &&
      !isNaN(cliente.longitud);

    if (tieneCoordenadas) {
      // 1. Cliente con coordenadas: buscar la zona con distribuidor activo más cercana dentro del radio (50 km)
      if (zonasActivasConGps.length > 0) {
        let menorDistancia = Infinity;
        let zonaCercanaId: string | null = null;

        for (const zona of zonasActivasConGps) {
          if (zona.latitud === null || zona.longitud === null) continue;
          const d = calcularDistanciaHaversineKm(
            cliente.latitud!,
            cliente.longitud!,
            zona.latitud,
            zona.longitud
          );

          const esMenor = d < menorDistancia;
          const esEmpate = Math.abs(d - menorDistancia) < 1e-6;
          const ganaPorDesempate = esEmpate && zonaCercanaId !== null && zona.id < zonaCercanaId;

          if (esMenor || ganaPorDesempate) {
            menorDistancia = d;
            zonaCercanaId = zona.id;
          }
        }

        if (zonaCercanaId && menorDistancia <= radioKm) {
          nuevaZonaId = zonaCercanaId;
          fuePorGps = true;
        } else {
          nuevaZonaId = null;
        }
      } else {
        nuevaZonaId = null;
      }
    } else {
      // 2. Cliente sin coordenadas:
      // Conservar asignación previa si la zona existe y su distribuidor está ACTIVO.
      // Si el distribuidor no existe o no está ACTIVO, resetear a null.
      if (cliente.zonaId) {
        const zonaExistente = zonasMap.get(cliente.zonaId);
        if (
          zonaExistente &&
          zonaExistente.distribuidor &&
          zonaExistente.distribuidor.estado === 'ACTIVO'
        ) {
          nuevaZonaId = cliente.zonaId;
        } else {
          nuevaZonaId = null;
        }
      } else {
        nuevaZonaId = null;
      }
    }

    // Si cambió la zona
    if (nuevaZonaId !== cliente.zonaId) {
      await prisma.cliente.update({
        where: { id: cliente.id },
        data: { zonaId: nuevaZonaId },
      });
      reasignados++;
      if (fuePorGps && nuevaZonaId) asignadosPorGps++;
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
