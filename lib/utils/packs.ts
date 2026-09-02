export interface ProductoItemParsed {
  identificador: string; // SKU o Nombre
  cantidad: number;
}

/**
 * Parsea el contenido de la columna de productos/ítems de un pack.
 * Formatos soportados:
 * 1. Separados por barra vertical (|) o saltos de línea / comas:
 *    - SKU_o_Nombre:Cantidad | SKU_o_Nombre:Cantidad
 *    - SH-ARGAN-1000:2 | MAS-NUTRI-1000:1 | SER-ARGAN-250:1
 *    - Shampoo Nutrición Total 1000ml:2 | Máscara Capilar Argán 1000g:1 | Sérum Restaurador 250ml:1
 *    - SH-ARGAN-1000 | MAS-NUTRI-1000 | SER-ARGAN-250 (omitiendo :1)
 * 2. Formato con 'x' o 'X':
 *    - 2x SH-ARGAN-1000 | 1x MAS-NUTRI-1000
 *    - SH-ARGAN-1000 x 2 | MAS-NUTRI-1000 x 1
 * 3. JSON Array:
 *    - [{"producto":"SH-ARGAN-1000","cantidad":2}]
 */
export function parsearProductosPack(productosRaw: string | null | undefined): ProductoItemParsed[] {
  if (!productosRaw || typeof productosRaw !== 'string') {
    return [];
  }

  const rawTrimmed = productosRaw.trim();
  if (!rawTrimmed) return [];

  // Intento 1: Es un JSON válido
  if (rawTrimmed.startsWith('[') && rawTrimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(rawTrimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((item) => item && typeof item === 'object')
          .map((item) => {
            const identificador = String(item.producto || item.sku || item.nombre || item.codigo || '').trim();
            const cantidadNum = Number(item.cantidad || item.cant || 1);
            const cantidad = !isNaN(cantidadNum) && cantidadNum > 0 ? Math.floor(cantidadNum) : 1;
            return {
              identificador,
              cantidad,
            };
          })
          .filter((it) => Boolean(it.identificador));
      }
    } catch {
      // Continuar con parseo estándar
    }
  }

  // Intento 2: Separar por barra vertical '|' o saltos de línea (si no hay |, probar comas o punto y coma)
  let partes: string[] = [];
  if (rawTrimmed.includes('|')) {
    partes = rawTrimmed.split('|').map((s) => s.trim()).filter(Boolean);
  } else if (rawTrimmed.includes('\n')) {
    partes = rawTrimmed.split('\n').map((s) => s.trim()).filter(Boolean);
  } else if (rawTrimmed.includes(';')) {
    partes = rawTrimmed.split(';').map((s) => s.trim()).filter(Boolean);
  } else if (rawTrimmed.includes(',')) {
    // Solo si no parece una descripción con comas
    partes = rawTrimmed.split(',').map((s) => s.trim()).filter(Boolean);
  } else {
    partes = [rawTrimmed];
  }

  const resultado: ProductoItemParsed[] = [];

  for (const parte of partes) {
    if (!parte) continue;

    // Patrón 1: "Identificador:Cantidad" (ej: "SH-ARGAN-1000:2" o "Shampoo: 2")
    if (parte.includes(':')) {
      const tokens = parte.split(':').map((t) => t.trim());
      const identificador = tokens[0];
      const cantidadNum = Number(tokens[1]);
      const cantidad = !isNaN(cantidadNum) && cantidadNum > 0 ? Math.floor(cantidadNum) : 1;

      if (identificador) {
        resultado.push({ identificador, cantidad });
      }
      continue;
    }

    // Patrón 2: "2x Identificador" o "2 x Identificador"
    const matchPrefixX = parte.match(/^(\d+)\s*[xX*]\s*(.+)$/);
    if (matchPrefixX) {
      const cantidadNum = Number(matchPrefixX[1]);
      const identificador = matchPrefixX[2].trim();
      const cantidad = !isNaN(cantidadNum) && cantidadNum > 0 ? Math.floor(cantidadNum) : 1;
      if (identificador) {
        resultado.push({ identificador, cantidad });
      }
      continue;
    }

    // Patrón 3: "Identificador x 2" o "Identificador x2"
    const matchSuffixX = parte.match(/^(.+?)\s*[xX*]\s*(\d+)$/);
    if (matchSuffixX) {
      const identificador = matchSuffixX[1].trim();
      const cantidadNum = Number(matchSuffixX[2]);
      const cantidad = !isNaN(cantidadNum) && cantidadNum > 0 ? Math.floor(cantidadNum) : 1;
      if (identificador) {
        resultado.push({ identificador, cantidad });
      }
      continue;
    }

    // Patrón 4: "Identificador (x2)" o "Identificador (2)" o "Identificador (2 unid)"
    const matchParentesis = parte.match(/^(.+?)\s*\(\s*(?:x\s*)?(\d+)(?:\s*unid(?:ades)?)?\s*\)$/i);
    if (matchParentesis) {
      const identificador = matchParentesis[1].trim();
      const cantidadNum = Number(matchParentesis[2]);
      const cantidad = !isNaN(cantidadNum) && cantidadNum > 0 ? Math.floor(cantidadNum) : 1;
      if (identificador) {
        resultado.push({ identificador, cantidad });
      }
      continue;
    }

    // Patrón 5: Sólo el identificador sin cantidad explícita (cantidad = 1)
    const identificador = parte.trim();
    if (identificador) {
      resultado.push({ identificador, cantidad: 1 });
    }
  }

  return resultado;
}
