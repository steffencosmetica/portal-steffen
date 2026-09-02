export interface VarianteProducto {
  nombre: string;
  precioPss?: number | null;
  precioEcommerce?: number | null;
  stock?: number | null;
  codigo?: string | null;
}

/**
 * Parsea un string o JSON de variantes a un arreglo tipado de VarianteProducto.
 * Soporta formatos:
 * 1. JSON: '[{"nombre":"Con Bomba","precioPss":12000},{"nombre":"Con Tapa Disc-top","precioPss":11000}]'
 * 2. Texto separado por comas o saltos de línea:
 *    - 'Con Bomba, Con Tapa Disc-top' (mismo precio base)
 *    - 'Con Bomba:12000, Con Tapa Disc-top:11000' (precio salón específico)
 *    - 'Con Bomba:12000:18000, Con Tapa Disc-top:11000:16500' (precioPss : precioEcommerce)
 */
export function parsearVariantes(variantesRaw: string | null | undefined): VarianteProducto[] {
  if (!variantesRaw || typeof variantesRaw !== 'string') {
    return [];
  }

  const rawTrimmed = variantesRaw.trim();
  if (!rawTrimmed) return [];

  // Intento 1: Es un JSON válido
  if (rawTrimmed.startsWith('[') && rawTrimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(rawTrimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((item) => item && typeof item === 'object' && typeof item.nombre === 'string' && item.nombre.trim())
          .map((item) => {
            const precioPssNum = Number(item.precioPss);
            const precioEcomNum = Number(item.precioEcommerce);
            const stockNum = Number(item.stock);

            return {
              nombre: String(item.nombre).trim(),
              precioPss: !isNaN(precioPssNum) && precioPssNum > 0 ? precioPssNum : null,
              precioEcommerce: !isNaN(precioEcomNum) && precioEcomNum > 0 ? precioEcomNum : null,
              stock: !isNaN(stockNum) && stockNum >= 0 ? Math.floor(stockNum) : null,
              codigo: item.codigo ? String(item.codigo).trim() : null,
            };
          });
      }
    } catch {
      // Si falla JSON.parse, continúa al parseo de texto plano
    }
  }

  // Intento 2: Parseo por delimitadores (coma, punto y coma, salto de línea, barra vertical)
  const partes = rawTrimmed.split(/[,;\n|]+/).map((s) => s.trim()).filter(Boolean);
  const resultado: VarianteProducto[] = [];

  for (const parte of partes) {
    if (!parte) continue;

    // Formato con dos puntos 'Nombre:precioPss:precioEcommerce'
    const tokens = parte.split(':').map((t) => t.trim());
    const nombre = tokens[0];

    if (!nombre) continue;

    let precioPss: number | null = null;
    let precioEcommerce: number | null = null;

    if (tokens.length >= 2) {
      const p1 = Number(tokens[1].replace(/[^0-9.]/g, ''));
      if (!isNaN(p1) && p1 > 0) {
        precioPss = p1;
      }
    }

    if (tokens.length >= 3) {
      const p2 = Number(tokens[2].replace(/[^0-9.]/g, ''));
      if (!isNaN(p2) && p2 > 0) {
        precioEcommerce = p2;
      }
    }

    resultado.push({
      nombre,
      precioPss,
      precioEcommerce,
    });
  }

  return resultado;
}

/**
 * Serializa un array de variantes a JSON string para almacenar en la base de datos.
 */
export function serializarVariantes(variantes: VarianteProducto[]): string | null {
  if (!variantes || !Array.isArray(variantes) || variantes.length === 0) {
    return null;
  }

  const limpias = variantes
    .filter((v) => v && typeof v.nombre === 'string' && v.nombre.trim())
    .map((v) => ({
      nombre: v.nombre.trim(),
      precioPss: v.precioPss && v.precioPss > 0 ? Number(v.precioPss) : null,
      precioEcommerce: v.precioEcommerce && v.precioEcommerce > 0 ? Number(v.precioEcommerce) : null,
      stock: v.stock !== undefined && v.stock !== null && v.stock >= 0 ? Number(v.stock) : null,
      codigo: v.codigo ? v.codigo.trim() : null,
    }));

  if (limpias.length === 0) return null;
  return JSON.stringify(limpias);
}

/**
 * Formatea variantes para visualización o exportación a Excel en texto legible.
 * Ej: "Con Bomba: 12000, Con Tapa Disc-top: 11000"
 */
export function formatearVariantesParaTexto(variantesRaw: string | VarianteProducto[] | null | undefined): string {
  const lista = Array.isArray(variantesRaw) ? variantesRaw : parsearVariantes(variantesRaw);
  if (!lista || lista.length === 0) return '';

  return lista
    .map((v) => {
      if (v.precioPss && v.precioEcommerce) {
        return `${v.nombre}:${v.precioPss}:${v.precioEcommerce}`;
      }
      if (v.precioPss) {
        return `${v.nombre}:${v.precioPss}`;
      }
      return v.nombre;
    })
    .join(', ');
}

/**
 * Obtiene el precio efectivo de un producto teniendo en cuenta la variante seleccionada.
 */
export function obtenerPreciosEfectivosProducto(
  producto: {
    precioPss: number;
    precioEcommerce: number;
    variantes?: string | VarianteProducto[] | null;
  },
  varianteNombre?: string | null
): {
  precioPss: number;
  precioEcommerce: number;
  varianteEncontrada: VarianteProducto | null;
} {
  const lista = Array.isArray(producto.variantes)
    ? producto.variantes
    : parsearVariantes(producto.variantes);

  if (!varianteNombre || !lista || lista.length === 0) {
    return {
      precioPss: Number(producto.precioPss),
      precioEcommerce: Number(producto.precioEcommerce),
      varianteEncontrada: null,
    };
  }

  const varianteEncontrada =
    lista.find((v) => v.nombre.trim().toLowerCase() === varianteNombre.trim().toLowerCase()) || null;

  const precioPss =
    varianteEncontrada?.precioPss && Number(varianteEncontrada.precioPss) > 0
      ? Number(varianteEncontrada.precioPss)
      : Number(producto.precioPss);

  const precioEcommerce =
    varianteEncontrada?.precioEcommerce && Number(varianteEncontrada.precioEcommerce) > 0
      ? Number(varianteEncontrada.precioEcommerce)
      : Number(producto.precioEcommerce);

  return {
    precioPss,
    precioEcommerce,
    varianteEncontrada,
  };
}
