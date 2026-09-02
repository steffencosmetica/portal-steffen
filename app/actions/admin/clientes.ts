'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server';
import { EstadoCliente, Rol } from '@prisma/client';

export interface ActualizarClienteData {
  nombre?: string;
  apellido?: string;
  whatsapp?: string;
  email?: string;
  zonaId?: string | null;
  estadoCliente?: EstadoCliente;
}

export interface ActualizarClienteResultado {
  success: boolean;
  error?: string;
}

const ESTADOS_CLIENTE_VALIDOS: EstadoCliente[] = [
  EstadoCliente.PENDIENTE_APROBACION,
  EstadoCliente.ACTIVO,
  EstadoCliente.INACTIVO,
  EstadoCliente.BLOQUEADO,
];

/**
 * Server Action para actualizar la información de un cliente/salón desde el panel de administración.
 * Incluye defensa en profundidad: verificación de autenticación y rol ADMIN a nivel de endpoint.
 *
 * NOTA DE ARQUITECTURA CRÍTICA:
 * El campo `email` que se actualiza en esta acción corresponde ÚNICAMENTE al email de contacto
 * comercial registrado en la tabla `Cliente`. Esta operación NO modifica la tabla `Usuario` ni
 * altera las credenciales de inicio de sesión en Supabase Auth (`auth.users`).
 * Esta separación es una decisión intencional de producto para no comprometer el acceso del usuario
 * al editar datos de contacto operativo desde el panel de gestión.
 */
export async function actualizarClienteAction(
  clienteId: string,
  data: ActualizarClienteData
): Promise<ActualizarClienteResultado> {
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

    // 2. Chequeo explícito de rol ADMIN en Prisma (Defensa en profundidad)
    const usuario = await prisma.usuario.findUnique({
      where: { authUserId: user.id },
    });

    if (!usuario || usuario.rol !== Rol.ADMIN) {
      console.warn(
        `[SECURITY] Intento no autorizado de actualizar cliente ${clienteId} por usuario ${user.id} con rol ${usuario?.rol}`
      );
      return {
        success: false,
        error: 'Acceso denegado. Se requieren permisos de Administrador.',
      };
    }

    // 3. Validar existencia del cliente
    const clienteExistente = await prisma.cliente.findUnique({
      where: { id: clienteId },
    });

    if (!clienteExistente) {
      return {
        success: false,
        error: 'El cliente que intentas actualizar no existe.',
      };
    }

    // 4. Validaciones de datos a actualizar
    const updatePayload: {
      nombre?: string;
      apellido?: string;
      whatsapp?: string;
      email?: string;
      zonaId?: string | null;
      estadoCliente?: EstadoCliente;
      alertaAprobacionVista?: boolean;
    } = {};

    if (data.nombre !== undefined) {
      const nombreTrim = data.nombre.trim();
      if (!nombreTrim) {
        return { success: false, error: 'El nombre no puede estar vacío.' };
      }
      updatePayload.nombre = nombreTrim;
    }

    if (data.apellido !== undefined) {
      const apellidoTrim = data.apellido.trim();
      if (!apellidoTrim) {
        return { success: false, error: 'El apellido no puede estar vacío.' };
      }
      updatePayload.apellido = apellidoTrim;
    }

    if (data.whatsapp !== undefined) {
      const whatsappTrim = data.whatsapp.trim();
      if (!whatsappTrim) {
        return { success: false, error: 'El WhatsApp de contacto no puede estar vacío.' };
      }
      updatePayload.whatsapp = whatsappTrim;
    }

    if (data.email !== undefined) {
      const emailTrim = data.email.trim().toLowerCase();
      if (!emailTrim || !emailTrim.includes('@')) {
        return { success: false, error: 'El email de contacto proporcionado no es válido.' };
      }
      // Se actualiza únicamente el email de contacto en la tabla Cliente (no afecta Usuario ni Auth)
      updatePayload.email = emailTrim;
    }

    if (data.estadoCliente !== undefined) {
      if (!ESTADOS_CLIENTE_VALIDOS.includes(data.estadoCliente)) {
        return { success: false, error: 'El estado de cliente seleccionado no es válido.' };
      }
      updatePayload.estadoCliente = data.estadoCliente;
      
      // Si pasa a estado ACTIVO habiendo estado en otro estado, resetear alertaAprobacionVista a false
      // para asegurar que reciba la notificación de bienvenida y habilitación de precios profesionales
      if (data.estadoCliente === EstadoCliente.ACTIVO && clienteExistente.estadoCliente !== EstadoCliente.ACTIVO) {
        updatePayload.alertaAprobacionVista = false;
      }
    }

    if (data.zonaId !== undefined) {
      if (data.zonaId === null || data.zonaId === '') {
        updatePayload.zonaId = null;
      } else {
        const zonaExiste = await prisma.zona.findUnique({
          where: { id: data.zonaId },
        });
        if (!zonaExiste) {
          return { success: false, error: 'La zona geográfica seleccionada no existe.' };
        }
        updatePayload.zonaId = data.zonaId;
      }
    }

    // 5. Aplicar actualización en PostgreSQL
    const clienteActualizado = await prisma.cliente.update({
       where: { id: clienteId },
       data: updatePayload,
       include: { usuario: true },
     });

    // 5.1 Si se cambió el estado del cliente, sincronizar app_metadata en Supabase Auth
    if (data.estadoCliente !== undefined && clienteActualizado.usuario?.authUserId) {
      try {
        const supabaseAdmin = createAdminSupabaseClient();
        await supabaseAdmin.auth.admin.updateUserById(clienteActualizado.usuario.authUserId, {
          app_metadata: {
            rol: clienteActualizado.usuario.rol,
            estadoCliente: data.estadoCliente,
          },
        });
      } catch (authSyncError) {
        console.error('No se pudo sincronizar app_metadata.estadoCliente tras actualización:', authSyncError);
      }
    }

    // 6. Revalidar rutas administrativas y de catálogo/perfil
    revalidatePath('/admin');
    revalidatePath('/admin/clientes');
    revalidatePath(`/admin/clientes/${clienteId}`);
    revalidatePath('/catalogo');
    revalidatePath('/perfil');

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error al actualizar cliente:', error);
    return {
      success: false,
      error: 'Ocurrió un error inesperado en el servidor al actualizar los datos del cliente.',
    };
  }
}
