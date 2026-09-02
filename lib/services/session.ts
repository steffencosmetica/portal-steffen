import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { EstadoCliente, Rol, Cliente, Usuario, Zona, Distribuidor } from '@prisma/client';

export type ClienteConZonaYDistribuidor = Cliente & {
  zona?: (Zona & { distribuidor?: Distribuidor | null }) | null;
};

export interface SesionClienteResultado {
  user: {
    id: string;
    email?: string;
  };
  usuario: Usuario;
  cliente: ClienteConZonaYDistribuidor | null;
  estadoCliente: EstadoCliente | null;
  rol: Rol;
}

/**
 * Obtiene de forma segura la sesión del usuario actual desde las cookies del servidor
 * y recupera el registro de Usuario y Cliente desde PostgreSQL con Prisma.
 * 
 * Si no hay sesión o el usuario no existe, devuelve null.
 */
export async function obtenerSesionCliente(): Promise<SesionClienteResultado | null> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    let usuario = await prisma.usuario.findUnique({
      where: { authUserId: user.id },
      include: {
        cliente: {
          include: {
            zona: {
              include: {
                distribuidor: true,
              },
            },
          },
        },
      },
    });

    // Si no se encuentra por authUserId, buscar por email y sincronizar authUserId
    if (!usuario && user.email) {
      const usuarioPorEmail = await prisma.usuario.findUnique({
        where: { email: user.email.toLowerCase() },
        include: {
          cliente: {
            include: {
              zona: {
                include: {
                  distribuidor: true,
                },
              },
            },
          },
        },
      });

      if (usuarioPorEmail) {
        usuario = await prisma.usuario.update({
          where: { id: usuarioPorEmail.id },
          data: { authUserId: user.id },
          include: {
            cliente: {
              include: {
                zona: {
                  include: {
                    distribuidor: true,
                  },
                },
              },
            },
          },
        });
      }
    }

    if (!usuario) {
      return null;
    }

    return {
      user: {
        id: user.id,
        email: user.email,
      },
      usuario,
      cliente: usuario.cliente,
      estadoCliente: usuario.cliente?.estadoCliente || null,
      rol: usuario.rol,
    };
  } catch (error) {
    console.error('Error al obtener la sesión del cliente en el servidor:', error);
    return null;
  }
}

