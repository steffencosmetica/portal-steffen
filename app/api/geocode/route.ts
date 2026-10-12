import { NextRequest, NextResponse } from 'next/server';
import { buscarGeocodificacion, GeocodeResultItem } from '@/lib/services/geocoding';

export type { GeocodeResultItem };

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = (searchParams.get('q') || searchParams.get('query') || '').trim();
    const provinciaFilter = (searchParams.get('provincia') || '').trim();

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const results = await buscarGeocodificacion(query, provinciaFilter);
    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error en /api/geocode:', error);
    return NextResponse.json({ results: [] }, { status: 500 });
  }
}
