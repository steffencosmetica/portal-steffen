export const CATEGORIAS_PRODUCTO = [
  'Sérums y Cristales',
  'Shampoo',
  'Acondicionadores',
  'Tratamientos',
  'Emulsiones',
  'Brillos',
  'Bi-phase',
  'Ceras',
  'Exhibidoras',
  'Packs',
] as const;

export type CategoriaProducto = (typeof CATEGORIAS_PRODUCTO)[number];
