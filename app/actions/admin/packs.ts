'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Rol, Prisma } from '@prisma/client';

export interface PackItemInput {
  productoId: string;
  cantidad: number;
}

export interface GuardarPackData {
  codigo?: string | null;
  nombre: string;
  descripcion: string;
  imagen: string;
  etiqueta?: string | null;
  precioOriginal?: number | null;
  precioDistribuidor?: number | null;
  precioDirecto?: number | null;
  descuentoDistribuidor?: number | null;
  descuentoDirecto?: number | null;
  precioPromocional?: number;
  activo?: boolean;
  destacado?: boolean;
  ordenVisualizacion?: number;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  items?: PackItemInput[];
}

export interface GuardarPackResultado {
  success: boolean;
  packId?: string;
  error?: string;
}

export interface CambiarEstadoPackResultado {
  success: boolean;
  error?: string;
}

async function verificarAdminAuth() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: 'No autorizado. Debes iniciar sesión.' };
  }

  const usuario = await prisma.usuario.findUnique({
    where: { authUserId: user.id },
  });

  if (!usuario || usuario.rol !== Rol.ADMIN) {
    return { ok: false, error: 'Acceso denegado. Se requieren permisos de Administrador.' };
  }

  return { ok: true, usuario };
}

/**
 * Server Action para crear o actualizar un Pack / Combo Promocional.
 */
export async function guardarPackAction(
  packId: string | null,
  data: GuardarPackData
): Promise<GuardarPackResultado> {
  try {
    const authCheck = await verificarAdminAuth();
    if (!authCheck.ok) {
      return { success: false, error: authCheck.error };
    }

    // 1. Validaciones
    const nombre = data.nombre?.trim();
    if (!nombre) {
      return { success: false, error: 'El nombre del pack es obligatorio.' };
    }

    const descripcion = data.descripcion?.trim();
    if (!descripcion) {
      return { success: false, error: 'La descripción del pack es obligatoria.' };
    }

    const imagen = data.imagen?.trim();
    if (!imagen) {
      return { success: false, error: 'La URL o ruta de la imagen del pack es obligatoria.' };
    }

    const codigo = data.codigo?.trim() || null;
    const descuentoDistribuidor =
      data.descuentoDistribuidor !== undefined && data.descuentoDistribuidor !== null && !isNaN(Number(data.descuentoDistribuidor))
        ? Number(data.descuentoDistribuidor)
        : null;
    const descuentoDirecto =
      data.descuentoDirecto !== undefined && data.descuentoDirecto !== null && !isNaN(Number(data.descuentoDirecto))
        ? Number(data.descuentoDirecto)
        : null;

    let precioOriginal =
      data.precioOriginal !== undefined && data.precioOriginal !== null && !isNaN(Number(data.precioOriginal))
        ? Number(data.precioOriginal)
        : null;
    let precioDistribuidor =
      data.precioDistribuidor !== undefined && data.precioDistribuidor !== null && !isNaN(Number(data.precioDistribuidor))
        ? Number(data.precioDistribuidor)
        : null;
    let precioDirecto =
      data.precioDirecto !== undefined && data.precioDirecto !== null && !isNaN(Number(data.precioDirecto))
        ? Number(data.precioDirecto)
        : null;
    const ordenVisualizacion =
      data.ordenVisualizacion !== undefined && Number.isInteger(Number(data.ordenVisualizacion))
        ? Math.max(0, Number(data.ordenVisualizacion))
        : 0;

    const items = Array.isArray(data.items) ? data.items : [];

    for (const it of items) {
      if (!it.productoId || typeof it.productoId !== 'string') {
        return { success: false, error: 'Uno de los productos seleccionados no es válido.' };
      }
      if (!it.cantidad || isNaN(Number(it.cantidad)) || Number(it.cantidad) < 1) {
        return { success: false, error: 'La cantidad de cada producto debe ser al menos 1.' };
      }
    }

    // Validar vigencia temporal si se completaron fechas
    let fechaInicio: Date | null = null;
    let fechaFin: Date | null = null;

    if (data.fechaInicio) {
      const dt = new Date(data.fechaInicio);
      if (!isNaN(dt.getTime())) {
        fechaInicio = dt;
      }
    }

    if (data.fechaFin) {
      const dt = new Date(data.fechaFin);
      if (!isNaN(dt.getTime())) {
        fechaFin = dt;
      }
    }

    if (fechaInicio && fechaFin && fechaInicio > fechaFin) {
      return { success: false, error: 'La fecha de inicio no puede ser posterior a la fecha de fin.' };
    }

    // Obtener productos para calcular precio equivalente sugerido si hay items
    const productosIds = items.map((i) => i.productoId);
    let sumaPssEquivalente = 0;

    if (productosIds.length > 0) {
      const productosDB = await prisma.producto.findMany({
        where: { id: { in: productosIds } },
      });

      if (productosDB.length !== productosIds.length) {
        return { success: false, error: 'Uno o más productos seleccionados ya no existen en el catálogo.' };
      }

      const productosMap = new Map(productosDB.map((p) => [p.id, p]));
      for (const it of items) {
        const prod = productosMap.get(it.productoId)!;
        sumaPssEquivalente += Number(prod.precioPss) * Number(it.cantidad);
      }
    }

    // Si tenemos items y suma de productos, el precio base de lista es esa suma si no se definió otro
    if (sumaPssEquivalente > 0 && (!precioOriginal || precioOriginal <= 0)) {
      precioOriginal = sumaPssEquivalente;
    }

    const baseParaDescuento = precioOriginal || sumaPssEquivalente;

    // Calcular precios a partir de porcentajes si fueron informados
    if (baseParaDescuento > 0) {
      if (descuentoDistribuidor !== null && (precioDistribuidor === null || precioDistribuidor <= 0)) {
        precioDistribuidor = Math.round(baseParaDescuento * (1 - descuentoDistribuidor / 100));
      }
      if (descuentoDirecto !== null && (precioDirecto === null || precioDirecto <= 0)) {
        precioDirecto = Math.round(baseParaDescuento * (1 - descuentoDirecto / 100));
      }
    }

    let precioPromocional = Number(data.precioPromocional);
    if (isNaN(precioPromocional) || precioPromocional <= 0) {
      precioPromocional = precioDirecto || precioDistribuidor || baseParaDescuento || 0;
    }

    if (precioPromocional <= 0) {
      return { success: false, error: 'El precio del pack debe ser mayor a cero. Asegurate de incluir productos o definir el descuento.' };
    }

    let porcentajeDescuentoCalculado: number | null = null;
    if (baseParaDescuento > 0 && precioPromocional < baseParaDescuento) {
      porcentajeDescuentoCalculado = Number((((baseParaDescuento - precioPromocional) / baseParaDescuento) * 100).toFixed(2));
    }

    const activo = data.activo !== undefined ? Boolean(data.activo) : true;
    const destacado = data.destacado !== undefined ? Boolean(data.destacado) : false;
    const etiqueta = data.etiqueta?.trim() || null;

    const savedPack = await prisma.$transaction(async (tx) => {
      if (packId) {
        // Actualizar pack existente
        const updated = await (tx.pack as any).update({
          where: { id: packId },
          data: {
            codigo,
            nombre,
            descripcion,
            imagen,
            etiqueta,
            precioOriginal: precioOriginal ? new Prisma.Decimal(precioOriginal) : null,
            precioDistribuidor: precioDistribuidor ? new Prisma.Decimal(precioDistribuidor) : null,
            precioDirecto: precioDirecto ? new Prisma.Decimal(precioDirecto) : null,
            precioPromocional: new Prisma.Decimal(precioPromocional),
            precioPssEquivalente: sumaPssEquivalente > 0 ? new Prisma.Decimal(sumaPssEquivalente) : null,
            descuento: porcentajeDescuentoCalculado !== null ? new Prisma.Decimal(porcentajeDescuentoCalculado) : null,
            descuentoDistribuidor: descuentoDistribuidor !== null ? new Prisma.Decimal(descuentoDistribuidor) : null,
            descuentoDirecto: descuentoDirecto !== null ? new Prisma.Decimal(descuentoDirecto) : null,
            fechaInicio,
            fechaFin,
            activo,
            destacado,
            ordenVisualizacion,
          },
        });

        // Reemplazar items si fueron enviados
        if (items.length > 0) {
          await tx.packItem.deleteMany({
            where: { packId },
          });

          await tx.packItem.createMany({
            data: items.map((it) => ({
              packId: updated.id,
              productoId: it.productoId,
              cantidad: Number(it.cantidad),
            })),
          });
        }

        return updated;
      } else {
        // Crear nuevo pack
        const created = await (tx.pack as any).create({
          data: {
            codigo,
            nombre,
            descripcion,
            imagen,
            etiqueta,
            precioOriginal: precioOriginal ? new Prisma.Decimal(precioOriginal) : null,
            precioDistribuidor: precioDistribuidor ? new Prisma.Decimal(precioDistribuidor) : null,
            precioDirecto: precioDirecto ? new Prisma.Decimal(precioDirecto) : null,
            precioPromocional: new Prisma.Decimal(precioPromocional),
            precioPssEquivalente: sumaPssEquivalente > 0 ? new Prisma.Decimal(sumaPssEquivalente) : null,
            descuento: porcentajeDescuentoCalculado !== null ? new Prisma.Decimal(porcentajeDescuentoCalculado) : null,
            descuentoDistribuidor: descuentoDistribuidor !== null ? new Prisma.Decimal(descuentoDistribuidor) : null,
            descuentoDirecto: descuentoDirecto !== null ? new Prisma.Decimal(descuentoDirecto) : null,
            fechaInicio,
            fechaFin,
            activo,
            destacado,
            ordenVisualizacion,
            ...(items.length > 0
              ? {
                  items: {
                    create: items.map((it) => ({
                      productoId: it.productoId,
                      cantidad: Number(it.cantidad),
                    })),
                  },
                }
              : {}),
          },
        });

        return created;
      }
    });

    revalidatePath('/admin/packs');
    revalidatePath('/admin/packs/[id]', 'page');
    revalidatePath('/catalogo');
    revalidatePath('/carrito');

    return {
      success: true,
      packId: savedPack.id,
    };
  } catch (error) {
    console.error('Error al guardar pack en el servidor:', error);
    return {
      success: false,
      error: 'Error interno del servidor al guardar el pack.',
    };
  }
}

/**
 * Server Action para alternar estado activo/inactivo de un pack.
 */
export async function cambiarEstadoActivoPackAction(
  packId: string,
  activo: boolean
): Promise<CambiarEstadoPackResultado> {
  try {
    const authCheck = await verificarAdminAuth();
    if (!authCheck.ok) {
      return { success: false, error: authCheck.error };
    }

    await prisma.pack.update({
      where: { id: packId },
      data: { activo },
    });

    revalidatePath('/admin/packs');
    revalidatePath('/catalogo');
    revalidatePath('/carrito');

    return { success: true };
  } catch (error) {
    console.error('Error al cambiar estado activo del pack:', error);
    return { success: false, error: 'No se pudo actualizar el estado del pack.' };
  }
}

/**
 * Server Action para eliminar un pack.
 */
export async function eliminarPackAction(packId: string): Promise<CambiarEstadoPackResultado> {
  try {
    const authCheck = await verificarAdminAuth();
    if (!authCheck.ok) {
      return { success: false, error: authCheck.error };
    }

    await prisma.pack.delete({
      where: { id: packId },
    });

    revalidatePath('/admin/packs');
    revalidatePath('/catalogo');
    revalidatePath('/carrito');

    return { success: true };
  } catch (error) {
    console.error('Error al eliminar pack:', error);
    return { success: false, error: 'No se pudo eliminar el pack.' };
  }
}
