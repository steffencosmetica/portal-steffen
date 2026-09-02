export const PROVINCIAS_ARGENTINA = [
  'Buenos Aires',
  'Ciudad Autónoma de Buenos Aires',
  'Catamarca',
  'Chaco',
  'Chubut',
  'Córdoba',
  'Corrientes',
  'Entre Ríos',
  'Formosa',
  'Jujuy',
  'La Pampa',
  'La Rioja',
  'Mendoza',
  'Misiones',
  'Neuquén',
  'Río Negro',
  'Salta',
  'San Juan',
  'San Luis',
  'Santa Cruz',
  'Santa Fe',
  'Santiago del Estero',
  'Tierra del Fuego',
  'Tucumán',
] as const;

export type ProvinciaArgentina = typeof PROVINCIAS_ARGENTINA[number];

/**
 * Normaliza nombres de provincias devueltos por servicios como Google Places
 * para que coincidan con la lista estándar de provincias argentinas.
 */
export function normalizarProvinciaArgentina(nombreRaw: string): string {
  if (!nombreRaw) return '';
  const limpio = nombreRaw
    .replace(/^provincia\s+de\s+/i, '')
    .replace(/^provincia\s+/i, '')
    .trim();

  // Mapeos especiales
  if (/ciudad\s+aut[oó]noma|caba|buenos\s+aires\s+f\.?d\.?|capital\s+federal/i.test(limpio)) {
    return 'Ciudad Autónoma de Buenos Aires';
  }
  if (/tierra\s+del\s+fuego/i.test(limpio)) {
    return 'Tierra del Fuego';
  }

  // Buscar coincidencia exacta insensible a mayúsculas / tildes
  const removerAcentos = (str: string) =>
    str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const limpioSinAcentos = removerAcentos(limpio);

  const encontrada = PROVINCIAS_ARGENTINA.find(
    (p) => removerAcentos(p) === limpioSinAcentos
  );

  return encontrada || limpio;
}
