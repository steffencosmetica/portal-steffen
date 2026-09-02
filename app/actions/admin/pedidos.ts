'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { EstadoPedido, Rol } from '@prisma/client';

export interface ActualizarEstadoPedidoResultado {
  success: boolean;
  error?: string;
}

const ESTADOS_VALIDOS_ADMIN: EstadoPedido[] = [
  EstadoPedido.PEDIDO_RECIBIDO,
  EstadoPedido.CONTACTADO,
  EstadoPedido.PAGO_PENDIENTE,
  EstadoPedido.PAGADO,
  EstadoPedido.PREPARANDO,
  EstadoPedido.DESPACHADO,
  EstadoPedido.COMPLETADO,
  EstadoPedido.CANCELADO,
];

/**
 * Server Action para actualizar el estado de un pedido desde el panel de administración.
 * Incluye defensa en profundidad: verificación de autenticación y rol ADMIN a nivel de endpoint.
 */
export async function actualizarEstadoPedidoAction(
  pedidoId: string,
  nuevoEstado: EstadoPedido
): Promise<ActualizarEstadoPedidoResultado> {
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
        `[SECURITY] Intento no autorizado de actualizar pedido ${pedidoId} por usuario ${user.id} con rol ${usuario?.rol}`
      );
      return {
        success: false,
        error: 'Acceso denegado. Se requieren permisos de Administrador.',
      };
    }

    // 3. Validar que nuevoEstado sea válido y no sea CARRITO
    if (!nuevoEstado || !ESTADOS_VALIDOS_ADMIN.includes(nuevoEstado)) {
      return {
        success: false,
        error: 'El estado seleccionado no es válido para gestión administrativa.',
      };
    }

    // 4. Validar existencia del pedido
    const pedidoExistente = await prisma.pedido.findUnique({
      where: { id: pedidoId },
    });

    if (!pedidoExistente) {
      return {
        success: false,
        error: 'El pedido que intentas actualizar no existe.',
      };
    }

    // 5. Actualizar estado del pedido en PostgreSQL (y fechaCompletado según corresponda)
    const dataUpdate: {
      estado: EstadoPedido;
      fechaCompletado?: Date | null;
    } = {
      estado: nuevoEstado,
    };

    if (nuevoEstado === EstadoPedido.COMPLETADO) {
      dataUpdate.fechaCompletado = new Date();
    } else if (pedidoExistente.estado === EstadoPedido.COMPLETADO) {
      dataUpdate.fechaCompletado = null;
    }

    await prisma.pedido.update({
      where: { id: pedidoId },
      data: dataUpdate,
    });

    // 6. Revalidar rutas administrativas
    revalidatePath('/admin');
    revalidatePath('/admin/pedidos');
    revalidatePath(`/admin/pedidos/${pedidoId}`);

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error al actualizar estado del pedido:', error);
    return {
      success: false,
      error: 'Ocurrió un error inesperado en el servidor al actualizar el estado.',
    };
  }
}
