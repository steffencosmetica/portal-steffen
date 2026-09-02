'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Rol } from '@prisma/client';

export interface GuardarDistribuidorData {
  nombre: string;
  empresa?: string | null;
  provincia: string;
  localidades: string;
  whatsapp: string;
  estado: string; // 'ACTIVO' | 'INACTIVO'
  observaciones?: string | null;
}

export interface GuardarDistribuidorResultado {
  success: boolean;
  distribuidorId?: string;
  error?: string;
}

export interface EliminarDistribuidorResultado {
  success: boolean;
  error?: string;
}

/**
 * Crea o actualiza un Distribuidor Oficial Steffen.
 * Aplica verificación estricta de rol ADMIN en el servidor.
 */
export async function guardarDistribuidorAction(
  id: string | null,
  data: GuardarDistribuidorData
): Promise<GuardarDistribuidorResultado> {
  try {
    // 1. Chequeo de autenticación en el servidor
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: 'No autorizado. Debes iniciar sesión.',
      };
    }

    // 2. Chequeo explícito de rol ADMIN en PostgreSQL
    const usuario = await prisma.usuario.findUnique({
      where: { authUserId: user.id },
    });

    if (!usuario || usuario.rol !== Rol.ADMIN) {
      return {
        success: false,
        error: 'Permisos insuficientes. Se requiere rol de Administrador.',
      };
    }

    // 3. Validaciones de campos
    const nombre = data.nombre?.trim();
    if (!nombre) {
      return { success: false, error: 'El nombre del distribuidor es obligatorio.' };
    }

    const whatsapp = data.whatsapp?.trim();
    if (!whatsapp) {
      return { success: false, error: 'El teléfono / WhatsApp de contacto es obligatorio.' };
    }

    const provincia = data.provincia?.trim();
    if (!provincia) {
      return { success: false, error: 'La provincia es obligatoria.' };
    }

    const localidades = data.localidades?.trim();
    if (!localidades) {
      return { success: false, error: 'La descripción de localidades o zonas de cobertura es obligatoria.' };
    }

    const estado = data.estado === 'INACTIVO' ? 'INACTIVO' : 'ACTIVO';
    const empresa = data.empresa?.trim() || null;
    const observaciones = data.observaciones?.trim() || null;

    // 4. Inserción o actualización
    if (id) {
      const existe = await prisma.distribuidor.findUnique({
        where: { id },
      });

      if (!existe) {
        return { success: false, error: 'El distribuidor a editar no existe.' };
      }

      const actualizado = await prisma.distribuidor.update({
        where: { id },
        data: {
          nombre,
          empresa,
          provincia,
          localidades,
          whatsapp,
          estado,
          observaciones,
        },
      });

      revalidatePath('/admin/distribuidores');
      revalidatePath(`/admin/distribuidores/${id}`);
      revalidatePath('/admin/zonas');
      revalidatePath('/admin');

      return {
        success: true,
        distribuidorId: actualizado.id,
      };
    } else {
      const nuevo = await prisma.distribuidor.create({
        data: {
          nombre,
          empresa,
          provincia,
          localidades,
          whatsapp,
          estado,
          observaciones,
        },
      });

      revalidatePath('/admin/distribuidores');
      revalidatePath('/admin/zonas');
      revalidatePath('/admin');

      return {
        success: true,
        distribuidorId: nuevo.id,
      };
    }
  } catch (error) {
    console.error('Error al guardar distribuidor:', error);
    return {
      success: false,
      error: 'Ocurrió un error inesperado al guardar el distribuidor.',
    };
  }
}

/**
 * Elimina un Distribuidor.
 * Impide el borrado si tiene zonas asignadas para evitar dejar datos huérfanos.
 */
export async function eliminarDistribuidorAction(id: string): Promise<EliminarDistribuidorResultado> {
  try {
    // 1. Chequeo de autenticación
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'No autorizado. Debes iniciar sesión.' };
    }

    // 2. Chequeo de rol ADMIN
    const usuario = await prisma.usuario.findUnique({
      where: { authUserId: user.id },
    });

    if (!usuario || usuario.rol !== Rol.ADMIN) {
      return { success: false, error: 'Permisos insuficientes. Se requiere rol de Administrador.' };
    }

    // 3. Chequeo de zonas asociadas
    const zonasAsignadas = await prisma.zona.count({
      where: { distribuidorId: id },
    });

    if (zonasAsignadas > 0) {
      return {
        success: false,
        error: `No se puede eliminar el distribuidor porque tiene ${zonasAsignadas} zona(s) geográfica(s) asignada(s). Primero debes reasignar o desvincular esas zonas desde el módulo de Zonas.`,
      };
    }

    // 4. Borrado
    await prisma.distribuidor.delete({
      where: { id },
    });

    revalidatePath('/admin/distribuidores');
    revalidatePath('/admin/zonas');
    revalidatePath('/admin');

    return { success: true };
  } catch (error) {
    console.error('Error al eliminar distribuidor:', error);
    return {
      success: false,
      error: 'Ocurrió un error al intentar eliminar el distribuidor.',
    };
  }
}
