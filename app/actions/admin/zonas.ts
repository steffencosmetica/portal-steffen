'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Rol, EstadoZona } from '@prisma/client';
import { recalcularAsignacionesZonas, RADIO_MAXIMO_KM } from '@/lib/services/geolocalizacion';

export interface GuardarZonaData {
  provincia: string;
  localidad: string;
  estado: EstadoZona;
  distribuidorId?: string | null;
  latitud?: number | null;
  longitud?: number | null;
}

export interface GuardarZonaResultado {
  success: boolean;
  zonaId?: string;
  error?: string;
}

export interface EliminarZonaResultado {
  success: boolean;
  error?: string;
}

/**
 * Crea o actualiza una Zona Geográfica en el sistema.
 * Aplica validaciones de duplicados y asignación de distribuidores.
 */
export async function guardarZonaAction(
  id: string | null,
  data: GuardarZonaData
): Promise<GuardarZonaResultado> {
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
    const provincia = data.provincia?.trim();
    if (!provincia) {
      return { success: false, error: 'La provincia es obligatoria.' };
    }

    const localidad = data.localidad?.trim();
    if (!localidad) {
      return { success: false, error: 'La localidad es obligatoria.' };
    }

    if (!Object.values(EstadoZona).includes(data.estado)) {
      return { success: false, error: 'El estado de cobertura de la zona no es válido.' };
    }

    // 4. Validación y asignación de distribuidor
    let distribuidorId: string | null = null;
    if (data.estado === EstadoZona.SIN_DISTRIBUIDOR) {
      distribuidorId = null;
    } else if (data.distribuidorId) {
      const distribuidorExiste = await prisma.distribuidor.findUnique({
        where: { id: data.distribuidorId },
      });

      if (!distribuidorExiste) {
        return { success: false, error: 'El distribuidor seleccionado no existe.' };
      }
      distribuidorId = data.distribuidorId;
    }

    // 5. Validar que no exista duplicado para misma provincia y localidad
    const zonaExistente = await prisma.zona.findFirst({
      where: {
        provincia: { equals: provincia, mode: 'insensitive' },
        localidad: { equals: localidad, mode: 'insensitive' },
        ...(id ? { id: { not: id } } : {}),
      },
    });

    if (zonaExistente) {
      return {
        success: false,
        error: `Ya existe una zona registrada para "${localidad}, ${provincia}".`,
      };
    }

    const latitud = typeof data.latitud === 'number' && !isNaN(data.latitud) ? data.latitud : null;
    const longitud = typeof data.longitud === 'number' && !isNaN(data.longitud) ? data.longitud : null;

    let zonaFinalId: string;

    // 6. Inserción o actualización
    if (id) {
      const existe = await prisma.zona.findUnique({
        where: { id },
      });

      if (!existe) {
        return { success: false, error: 'La zona a editar no existe.' };
      }

      const actualizada = await prisma.zona.update({
        where: { id },
        data: {
          provincia,
          localidad,
          estado: data.estado,
          distribuidorId,
          latitud,
          longitud,
        },
      });

      zonaFinalId = actualizada.id;
    } else {
      const nueva = await prisma.zona.create({
        data: {
          provincia,
          localidad,
          estado: data.estado,
          distribuidorId,
          latitud,
          longitud,
        },
      });

      zonaFinalId = nueva.id;
    }

    // Si la zona tiene GPS, sincronizar salones dentro del radio de 10 km
    if (latitud !== null && longitud !== null) {
      try {
        await recalcularAsignacionesZonas(RADIO_MAXIMO_KM);
      } catch (errSync) {
        console.warn('Advertencia al sincronizar salones de la zona:', errSync);
      }
    }

    revalidatePath('/admin/zonas');
    revalidatePath(`/admin/zonas/${zonaFinalId}`);
    revalidatePath('/admin/distribuidores');
    revalidatePath('/admin/clientes');
    revalidatePath('/admin');

    return {
      success: true,
      zonaId: zonaFinalId,
    };
  } catch (error) {
    console.error('Error al guardar zona:', error);
    return {
      success: false,
      error: 'Ocurrió un error inesperado al guardar la zona.',
    };
  }
}

/**
 * Recalcula las asignaciones de salones a zonas geográficas según el radio de 10 km.
 */
export interface RecalcularZonasResultado {
  success: boolean;
  totalClientes?: number;
  reasignados?: number;
  asignadosPorGps?: number;
  sinCambios?: number;
  radioKm?: number;
  error?: string;
}

export async function recalcularZonasAction(): Promise<RecalcularZonasResultado> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'No autorizado. Debes iniciar sesión.' };
    }

    const usuario = await prisma.usuario.findUnique({
      where: { authUserId: user.id },
    });

    if (!usuario || usuario.rol !== Rol.ADMIN) {
      return { success: false, error: 'Permisos insuficientes. Se requiere rol de Administrador.' };
    }

    const resultado = await recalcularAsignacionesZonas(RADIO_MAXIMO_KM);

    revalidatePath('/admin/zonas');
    revalidatePath('/admin/distribuidores');
    revalidatePath('/admin/clientes');
    revalidatePath('/admin');

    return {
      success: true,
      ...resultado,
    };
  } catch (error) {
    console.error('Error al recalcular zonas:', error);
    return {
      success: false,
      error: 'Ocurrió un error al recalcular asignaciones de zonas.',
    };
  }
}

/**
 * Elimina una Zona Geográfica.
 * Si había clientes asignados a esta zona, quedan con zonaId: null automáticamente por onDelete: SetNull.
 */
export async function eliminarZonaAction(id: string): Promise<EliminarZonaResultado> {
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

    // 3. Borrado de la zona
    await prisma.zona.delete({
      where: { id },
    });

    revalidatePath('/admin/zonas');
    revalidatePath('/admin/distribuidores');
    revalidatePath('/admin/clientes');
    revalidatePath('/admin');

    return { success: true };
  } catch (error) {
    console.error('Error al eliminar zona:', error);
    return {
      success: false,
      error: 'Ocurrió un error al intentar eliminar la zona.',
    };
  }
}
