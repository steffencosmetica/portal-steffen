import { normalizarProvinciaArgentina } from '@/lib/constants/provincias';

export type PrecisionUbicacion = 'DIRECCION' | 'LOCALIDAD' | 'PROVINCIA' | 'DESCONOCIDA';

export interface GeocodeResultItem {
  direccionFormateada: string;
  provincia: string;
  localidad: string;
  lat: number;
  lng: number;
  precision?: PrecisionUbicacion;
}

export interface ResultadoGeocodificacion {
  lat: number;
  lng: number;
  precision: PrecisionUbicacion;
  direccionFormateada: string;
  localidad: string;
  provincia: string;
  esConfiable: boolean;
}

/**
 * Valida si un par de coordenadas geográficas se encuentra dentro de los límites de Argentina.
 * Límites aproximados: Latitud [-56.0, -21.0], Longitud [-74.0, -53.0].
 */
export function esCoordenadaValidaArgentina(lat: number, lng: number): boolean {
  if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
    return false;
  }
  return lat >= -56.0 && lat <= -21.0 && lng >= -74.0 && lng <= -53.0;
}

const TIMEOUT_GEOCODING_MS = 3500;

/**
 * Realiza una búsqueda de geocodificación mediante Google Geocoding API o Nominatim (OSM),
 * con tiempo de espera controlado y manejo seguro de fallos.
 */
export async function buscarGeocodificacion(
  query: string,
  provinciaFilter?: string
): Promise<GeocodeResultItem[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery || cleanQuery.length < 2) {
    return [];
  }

  const cleanProv = (provinciaFilter || '').trim();
  const fullQuery = cleanProv && !cleanQuery.toLowerCase().includes(cleanProv.toLowerCase())
    ? `${cleanQuery}, ${cleanProv}, Argentina`
    : cleanQuery.toLowerCase().includes('argentina')
    ? cleanQuery
    : `${cleanQuery}, Argentina`;

  const apiKey = (process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '').trim();

  // 1. Intentar Google Geocoding API si hay API key configurada
  if (apiKey) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_GEOCODING_MS);

      const googleUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        fullQuery
      )}&components=country:AR&language=es&key=${apiKey}`;

      const googleRes = await fetch(googleUrl, {
        signal: controller.signal,
        next: { revalidate: 3600 },
      });
      clearTimeout(timeoutId);

      if (googleRes.ok) {
        const data = await googleRes.json();
        if (data.status === 'OK' && Array.isArray(data.results) && data.results.length > 0) {
          const results: GeocodeResultItem[] = data.results.map((item: any) => {
            let provinciaRaw = '';
            let localidadRaw = '';
            let sublocalidad = '';
            let departamento = '';

            const types = item.types || [];
            let precision: PrecisionUbicacion = 'DESCONOCIDA';

            if (types.some((t: string) => ['street_address', 'premise', 'subpremise', 'route', 'intersection'].includes(t))) {
              precision = 'DIRECCION';
            } else if (types.some((t: string) => ['locality', 'sublocality', 'sublocality_level_1', 'administrative_area_level_2', 'postal_code'].includes(t))) {
              precision = 'LOCALIDAD';
            } else if (types.includes('administrative_area_level_1') || types.includes('country')) {
              precision = 'PROVINCIA';
            }

            if (Array.isArray(item.address_components)) {
              for (const comp of item.address_components) {
                const cTypes = comp.types || [];
                if (cTypes.includes('administrative_area_level_1')) {
                  provinciaRaw = comp.long_name || comp.short_name || '';
                } else if (cTypes.includes('locality')) {
                  localidadRaw = comp.long_name || '';
                } else if (cTypes.includes('sublocality') || cTypes.includes('sublocality_level_1')) {
                  sublocalidad = comp.long_name || '';
                } else if (cTypes.includes('administrative_area_level_2')) {
                  departamento = comp.long_name || '';
                }
              }
            }

            const localidadFinal = localidadRaw || sublocalidad || departamento || item.formatted_address.split(',')[0] || '';
            const provinciaFinal = normalizarProvinciaArgentina(provinciaRaw);

            return {
              direccionFormateada: item.formatted_address || '',
              provincia: provinciaFinal,
              localidad: localidadFinal,
              lat: item.geometry?.location?.lat ?? 0,
              lng: item.geometry?.location?.lng ?? 0,
              precision,
            };
          });

          return results;
        }
      }
    } catch (googleErr) {
      console.warn('Google Geocode error/timeout, cayendo a Nominatim:', googleErr);
    }
  }

  // 2. OpenStreetMap / Nominatim (Fallback libre y robusto para Argentina)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_GEOCODING_MS);

    const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      fullQuery
    )}&countrycodes=ar&format=json&addressdetails=1&limit=5`;

    const osmRes = await fetch(nominatimUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'SteffenCosmeticaPortal/1.0 (admin@steffencosmetica.com)',
        'Accept-Language': 'es,es-AR;q=0.9',
      },
      next: { revalidate: 3600 },
    });
    clearTimeout(timeoutId);

    if (osmRes.ok) {
      const osmData = await osmRes.json();
      if (Array.isArray(osmData) && osmData.length > 0) {
        return osmData.map((item: any) => {
          const addr = item.address || {};
          const rawProvincia = addr.state || addr.province || '';
          const rawLocalidad =
            addr.city ||
            addr.town ||
            addr.village ||
            addr.municipality ||
            addr.suburb ||
            addr.city_district ||
            addr.county ||
            item.name ||
            '';

          const provinciaFinal = normalizarProvinciaArgentina(rawProvincia);

          let precision: PrecisionUbicacion = 'DESCONOCIDA';
          const addresstype = item.addresstype || '';
          const type = item.type || '';
          const itemClass = item.class || '';

          if (
            addresstype === 'road' ||
            addresstype === 'house' ||
            itemClass === 'building' ||
            itemClass === 'highway' ||
            ['road', 'house', 'residential', 'building'].includes(type) ||
            Boolean(addr.road)
          ) {
            precision = 'DIRECCION';
          } else if (
            ['city', 'town', 'village', 'municipality', 'suburb', 'county', 'district'].includes(type) ||
            ['city', 'town', 'village', 'municipality'].includes(addresstype) ||
            Boolean(addr.city || addr.town || addr.village)
          ) {
            precision = 'LOCALIDAD';
          } else if (
            addresstype === 'state' ||
            addresstype === 'country' ||
            type === 'state' ||
            type === 'country' ||
            (itemClass === 'boundary' && !addr.city && !addr.town)
          ) {
            precision = 'PROVINCIA';
          }

          const displayParts = [
            rawLocalidad,
            provinciaFinal || rawProvincia,
            'Argentina',
          ].filter(Boolean);
          const direccionFormateada = item.display_name || Array.from(new Set(displayParts)).join(', ');

          return {
            direccionFormateada,
            provincia: provinciaFinal,
            localidad: rawLocalidad,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
            precision,
          };
        });
      }
    }
  } catch (osmErr) {
    console.warn('Nominatim Geocode error/timeout:', osmErr);
  }

  return [];
}

/**
 * Geocodifica la ubicación declarada por un salón (dirección, localidad y provincia)
 * del lado del servidor, evaluando estrictamente la precisión y confiabilidad del resultado.
 *
 * Criterios de confiabilidad:
 * 1. Coordenadas dentro de los límites de Argentina.
 * 2. Nivel de precisión 'DIRECCION' o 'LOCALIDAD' verificada.
 * 3. NUNCA considera confiable un resultado de nivel 'PROVINCIA' o 'DESCONOCIDA' para evitar
 *    utilizar el centro geográfico de una provincia como ubicación del salón.
 * 4. Valida consistencia con la provincia declarada para descartar coincidencias homónimas ambiguas.
 */
export async function geocodificarUbicacion({
  direccion,
  localidad,
  provincia,
}: {
  direccion?: string | null;
  localidad: string;
  provincia: string;
}): Promise<ResultadoGeocodificacion | null> {
  const cleanLoc = (localidad || '').trim();
  const cleanProv = (provincia || '').trim();
  const cleanDir = (direccion || '').trim();

  if (!cleanLoc || !cleanProv) {
    return null;
  }

  // 1. Intentar con dirección completa si fue provista
  let queryPrincipal = cleanDir ? `${cleanDir}, ${cleanLoc}` : cleanLoc;
  let items = await buscarGeocodificacion(queryPrincipal, cleanProv);

  // 2. Si falló la búsqueda con dirección o no hubo resultados, intentar con localidad y provincia
  if (items.length === 0 && cleanDir) {
    items = await buscarGeocodificacion(cleanLoc, cleanProv);
  }

  if (items.length === 0) {
    return null;
  }

  const mejorItem = items[0];
  const lat = mejorItem.lat;
  const lng = mejorItem.lng;

  // Validar coordenadas en Argentina
  if (!esCoordenadaValidaArgentina(lat, lng)) {
    return null;
  }

  const precision = mejorItem.precision || 'DESCONOCIDA';

  // Si la precisión es meramente a nivel PROVINCIA o país, NO es confiable para ubicar un salón
  if (precision === 'PROVINCIA' || precision === 'DESCONOCIDA') {
    return {
      lat,
      lng,
      precision,
      direccionFormateada: mejorItem.direccionFormateada,
      localidad: mejorItem.localidad,
      provincia: mejorItem.provincia,
      esConfiable: false,
    };
  }

  // Comprobar consistencia con la provincia declarada para descartar ambigüedades
  const provNormalizadaDeclarada = normalizarProvinciaArgentina(cleanProv).toLowerCase();
  const provNormalizadaResultado = normalizarProvinciaArgentina(mejorItem.provincia).toLowerCase();

  const esProvinciaConsistente =
    !provNormalizadaResultado ||
    provNormalizadaResultado === provNormalizadaDeclarada ||
    provNormalizadaResultado.includes(provNormalizadaDeclarada) ||
    provNormalizadaDeclarada.includes(provNormalizadaResultado);

  if (!esProvinciaConsistente) {
    // Resultado ambiguo (ej: localidad homónima en otra provincia)
    return {
      lat,
      lng,
      precision,
      direccionFormateada: mejorItem.direccionFormateada,
      localidad: mejorItem.localidad,
      provincia: mejorItem.provincia,
      esConfiable: false,
    };
  }

  return {
    lat,
    lng,
    precision,
    direccionFormateada: mejorItem.direccionFormateada,
    localidad: mejorItem.localidad || cleanLoc,
    provincia: mejorItem.provincia || cleanProv,
    esConfiable: true,
  };
}
