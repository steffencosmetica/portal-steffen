'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Rol, TipoDescuento } from '@prisma/client';

export interface AccionReglaDescuentoResultado {
  success: boolean;
  error?: string;
}

async function verificarAdmin() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('No autorizado. Debes iniciar sesión.');
  }

  const usuario = await prisma.usuario.findUnique({
    where: { authUserId: user.id },
  });

  if (!usuario || usuario.rol !== Rol.ADMIN) {
    throw new Error('Acceso denegado. Se requieren permisos de Administrador.');
  }

  return usuario;
}

/**
 * Actualiza una regla de descuento existente
 */
export async function actualizarReglaDescuentoAction(
  id: string,
  datos: {
    porcentaje: number;
    diasDesde?: number | null;
    diasHasta?: number | null;
    activa: boolean;
    orden?: number;
  }
): Promise<AccionReglaDescuentoResultado> {
  try {
    await verificarAdmin();

    if (!id) {
      return { success: false, error: 'ID de regla no especificado.' };
    }

    if (datos.porcentaje < 0 || datos.porcentaje > 100) {
      return { success: false, error: 'El porcentaje debe estar entre 0% y 100%.' };
    }

    if (datos.diasDesde !== undefined && datos.diasDesde !== null && datos.diasDesde < 0) {
      return { success: false, error: 'Los días desde deben ser 0 o mayores.' };
    }

    if (
      datos.diasDesde !== undefined &&
      datos.diasDesde !== null &&
      datos.diasHasta !== undefined &&
      datos.diasHasta !== null &&
      datos.diasHasta < datos.diasDesde
    ) {
      return { success: false, error: 'Los días hasta deben ser mayores o iguales a los días desde.' };
    }

    await prisma.reglaDeDescuento.update({
      where: { id },
      data: {
        porcentaje: datos.porcentaje,
        diasDesde: datos.diasDesde,
        diasHasta: datos.diasHasta,
        activa: datos.activa,
        orden: datos.orden ?? 0,
      },
    });

    revalidatePath('/admin');
    revalidatePath('/admin/reglas-descuento');
    revalidatePath('/catalogo');
    revalidatePath('/perfil');
    revalidatePath('/');

    return { success: true };
  } catch (error: any) {
    console.error('Error al actualizar regla de descuento:', error);
    return { success: false, error: error.message || 'Error al actualizar la regla.' };
  }
}

/**
 * Crea una nueva regla de descuento
 */
export async function crearReglaDescuentoAction(datos: {
  tipo: TipoDescuento;
  porcentaje: number;
  diasDesde?: number | null;
  diasHasta?: number | null;
  activa?: boolean;
  orden?: number;
}): Promise<AccionReglaDescuentoResultado> {
  try {
    await verificarAdmin();

    if (datos.porcentaje < 0 || datos.porcentaje > 100) {
      return { success: false, error: 'El porcentaje debe estar entre 0% y 100%.' };
    }

    if (datos.tipo === TipoDescuento.REPOSICION) {
      if (datos.diasDesde === undefined || datos.diasDesde === null || datos.diasDesde < 0) {
        return { success: false, error: 'Debes especificar los días desde (0 o mayor) para una regla de reposición.' };
      }
      if (datos.diasHasta !== undefined && datos.diasHasta !== null && datos.diasHasta < datos.diasDesde) {
        return { success: false, error: 'Los días hasta no pueden ser menores a los días desde.' };
      }
    }

    await prisma.reglaDeDescuento.create({
      data: {
        tipo: datos.tipo,
        porcentaje: datos.porcentaje,
        diasDesde: datos.tipo === TipoDescuento.REPOSICION ? (datos.diasDesde ?? 0) : null,
        diasHasta: datos.tipo === TipoDescuento.REPOSICION ? (datos.diasHasta ?? null) : null,
        activa: datos.activa ?? true,
        orden: datos.orden ?? 0,
      },
    });

    revalidatePath('/admin');
    revalidatePath('/admin/reglas-descuento');
    revalidatePath('/catalogo');
    revalidatePath('/perfil');
    revalidatePath('/');

    return { success: true };
  } catch (error: any) {
    console.error('Error al crear regla de descuento:', error);
    return { success: false, error: error.message || 'Error al crear la regla.' };
  }
}

/**
 * Alterna el estado activo/inactivo de una regla
 */
export async function alternarEstadoReglaAction(
  id: string,
  activa: boolean
): Promise<AccionReglaDescuentoResultado> {
  try {
    await verificarAdmin();

    await prisma.reglaDeDescuento.update({
      where: { id },
      data: { activa },
    });

    revalidatePath('/admin');
    revalidatePath('/admin/reglas-descuento');
    revalidatePath('/catalogo');
    revalidatePath('/perfil');
    revalidatePath('/');

    return { success: true };
  } catch (error: any) {
    console.error('Error al alternar estado de regla:', error);
    return { success: false, error: error.message || 'Error al alternar estado.' };
  }
}
