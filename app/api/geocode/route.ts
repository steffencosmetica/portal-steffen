import { NextRequest, NextResponse } from 'next/server';
import { normalizarProvinciaArgentina, PROVINCIAS_ARGENTINA } from '@/lib/constants/provincias';

export interface GeocodeResultItem {
  direccionFormateada: string;
  provincia: string;
  localidad: string;
  lat: number;
  lng: number;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = (searchParams.get('q') || searchParams.get('query') || '').trim();
    const provinciaFilter = (searchParams.get('provincia') || '').trim();

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const fullQuery = provinciaFilter && !query.toLowerCase().includes(provinciaFilter.toLowerCase())
      ? `${query}, ${provinciaFilter}, Argentina`
      : query.toLowerCase().includes('argentina')
      ? query
      : `${query}, Argentina`;

    const apiKey = (process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '').trim();

    // 1. Intentar Google Geocoding API si hay API key configurada
    if (apiKey) {
      try {
        const googleUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          fullQuery
        )}&components=country:AR&language=es&key=${apiKey}`;

        const googleRes = await fetch(googleUrl, { next: { revalidate: 3600 } });
        if (googleRes.ok) {
          const data = await googleRes.json();
          if (data.status === 'OK' && Array.isArray(data.results) && data.results.length > 0) {
            const results: GeocodeResultItem[] = data.results.map((item: any) => {
              let provinciaRaw = '';
              let localidadRaw = '';
              let sublocalidad = '';
              let departamento = '';

              if (Array.isArray(item.address_components)) {
                for (const comp of item.address_components) {
                  const types = comp.types || [];
                  if (types.includes('administrative_area_level_1')) {
                    provinciaRaw = comp.long_name || comp.short_name || '';
                  } else if (types.includes('locality')) {
                    localidadRaw = comp.long_name || '';
                  } else if (types.includes('sublocality') || types.includes('sublocality_level_1')) {
                    sublocalidad = comp.long_name || '';
                  } else if (types.includes('administrative_area_level_2')) {
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
              };
            });

            return NextResponse.json({ results });
          }
        }
      } catch (googleErr) {
        console.warn('Google Geocode error, cayendo a OpenStreetMap:', googleErr);
      }
    }

    // 2. OpenStreetMap / Nominatim (Fallback robusto y libre para toda Argentina)
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      fullQuery
    )}&countrycodes=ar&format=json&addressdetails=1&limit=6`;

    const osmRes = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'SteffenCosmeticaPortal/1.0 (admin@steffencosmetica.com)',
        'Accept-Language': 'es,es-AR;q=0.9',
      },
      next: { revalidate: 3600 },
    });

    if (!osmRes.ok) {
      return NextResponse.json({ results: [] });
    }

    const osmData = await osmRes.json();
    if (!Array.isArray(osmData)) {
      return NextResponse.json({ results: [] });
    }

    const results: GeocodeResultItem[] = osmData.map((item: any) => {
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

      // Formatear dirección limpia
      const displayParts = [
        rawLocalidad,
        provinciaFinal || rawProvincia,
        'Argentina',
      ].filter(Boolean);

      const direccionFormateada = Array.from(new Set(displayParts)).join(', ');

      return {
        direccionFormateada: item.display_name || direccionFormateada,
        provincia: provinciaFinal,
        localidad: rawLocalidad,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
      };
    });

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error en /api/geocode:', error);
    return NextResponse.json({ results: [] }, { status: 500 });
  }
}
