import { prisma } from '@/lib/prisma';
import { Pack, PackItem, Producto, Cliente, Zona, EstadoZona } from '@prisma/client';

export type PackConItems = Pack & {
  items: (PackItem & {
    producto: Producto;
  })[];
};

export interface DisponibilidadPackResultado {
  disponible: boolean;
  motivo?: string;
  pack?: PackConItems | null;
}

export interface PreciosEfectivosPack {
  precioFinal: number;
  precioOriginalTachado: number | null;
  ahorroMonto: number | null;
  porcentajeDescuento: number | null;
  tipoPrecio: 'DISTRIBUIDOR' | 'DIRECTO' | 'PROMOCIONAL';
}

/**
 * Calcula el precio exacto del pack según la condición de la cuenta del salón:
 * - Cuenta con distribuidor activo -> Aplica 'precioDistribuidor'
 * - Cuenta sin distribuidor activo (venta directa fábrica) -> Aplica 'precioDirecto'
 * - Precio Original de referencia -> 'precioOriginal' (se muestra tachado con el descuento)
 */
export function obtenerPrecioPackParaCliente(
  pack: {
    precioOriginal?: any;
    precioDistribuidor?: any;
    precioDirecto?: any;
    precioPromocional?: any;
    precioPssEquivalente?: any;
  },
  cliente?: (Cliente & { zona?: Zona | null }) | null
): PreciosEfectivosPack {
  const tieneDistribuidor = Boolean(
    cliente?.zona?.distribuidorId || cliente?.zona?.estado === EstadoZona.CON_DISTRIBUIDOR
  );

  const precioDist = pack.precioDistribuidor ? Number(pack.precioDistribuidor) : null;
  const precioDir = pack.precioDirecto ? Number(pack.precioDirecto) : null;
  const precioPromo = pack.precioPromocional ? Number(pack.precioPromocional) : 0;
  const precioOrig = pack.precioOriginal
    ? Number(pack.precioOriginal)
    : pack.precioPssEquivalente
    ? Number(pack.precioPssEquivalente)
    : null;

  let precioFinal = precioPromo;
  let tipoPrecio: 'DISTRIBUIDOR' | 'DIRECTO' | 'PROMOCIONAL' = 'PROMOCIONAL';

  if (tieneDistribuidor && precioDist !== null && precioDist > 0) {
    precioFinal = precioDist;
    tipoPrecio = 'DISTRIBUIDOR';
  } else if (!tieneDistribuidor && precioDir !== null && precioDir > 0) {
    precioFinal = precioDir;
    tipoPrecio = 'DIRECTO';
  } else if (precioPromo > 0) {
    precioFinal = precioPromo;
  }

  let ahorroMonto: number | null = null;
  let porcentajeDescuento: number | null = null;

  if (precioOrig !== null && precioOrig > precioFinal) {
    ahorroMonto = precioOrig - precioFinal;
    porcentajeDescuento = Math.round(((precioOrig - precioFinal) / precioOrig) * 100);
  }

  return {
    precioFinal,
    precioOriginalTachado: precioOrig,
    ahorroMonto,
    porcentajeDescuento,
    tipoPrecio,
  };
}

/**
 * Evalúa la disponibilidad de un Pack promocional o combo a partir del objeto pack en memoria:
 * 1. El pack debe existir y estar activo.
 * 2. Si tiene fechaInicio o fechaFin, debe encontrarse dentro de la ventana de vigencia temporal.
 * 3. Si posee productos componentes configurados, todos deben estar activos y contar con stock.
 */
export function evaluarDisponibilidadPack(pack: any): DisponibilidadPackResultado {
  if (!pack) {
    return { disponible: false, motivo: 'El pack no existe' };
  }

  if (!pack.activo) {
    return { disponible: false, motivo: 'El pack se encuentra inactivo', pack };
  }

  const ahora = new Date();
  if (pack.fechaInicio && new Date(pack.fechaInicio) > ahora) {
    return { disponible: false, motivo: 'El pack aún no está vigente', pack };
  }

  if (pack.fechaFin && new Date(pack.fechaFin) < ahora) {
    return { disponible: false, motivo: 'El pack ha finalizado su vigencia', pack };
  }

  // Si tiene productos asignados, verificar disponibilidad y stock de cada uno
  if (pack.items && pack.items.length > 0) {
    for (const item of pack.items) {
      if (!item.producto || !item.producto.activo) {
        return {
          disponible: false,
          motivo: `El producto "${item.producto?.nombre || 'componente'}" no se encuentra activo`,
          pack,
        };
      }

      if (item.producto.stock < item.cantidad) {
        return {
          disponible: false,
          motivo: 'Uno o más productos del pack no tienen stock',
          pack,
        };
      }
    }
  }

  return {
    disponible: true,
    pack,
  };
}

/**
 * Evalúa la disponibilidad de un Pack promocional o combo consultando la base de datos:
 */
export async function calcularDisponibilidadPack(
  packId: string
): Promise<DisponibilidadPackResultado> {
  if (!packId) {
    return { disponible: false, motivo: 'ID de pack no válido' };
  }

  const pack = await prisma.pack.findUnique({
    where: { id: packId },
    include: {
      items: {
        include: {
          producto: true,
        },
      },
    },
  });

  return evaluarDisponibilidadPack(pack);
}
