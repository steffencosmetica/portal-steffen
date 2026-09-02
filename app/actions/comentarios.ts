'use server';

import { prisma } from '@/lib/prisma';
import { obtenerSesionCliente } from '@/lib/services/session';
import { revalidatePath } from 'next/cache';

export interface AgregarComentarioInput {
  productoId: string;
  calificacion: number;
  comentario: string;
  // Campos opcionales si vienen de cliente, pero el servidor los valida y auto-completa desde la sesión verificada
  nombreSalon?: string;
  nombreAutor?: string;
  localidad?: string;
}

export interface ComentarioResponse {
  success: boolean;
  error?: string;
  comentario?: {
    id: string;
    nombreSalon: string;
    nombreAutor: string;
    localidad: string | null;
    calificacion: number;
    comentario: string;
    verificado: boolean;
    createdAt: string;
  };
}

export async function agregarComentarioAction(
  input: AgregarComentarioInput
): Promise<ComentarioResponse> {
  try {
    const { productoId, calificacion, comentario } = input;

    if (!productoId) {
      return { success: false, error: 'Producto no especificado.' };
    }

    if (!comentario || comentario.trim().length < 5) {
      return { success: false, error: 'Por favor escribí una reseña u opinión de al menos 5 caracteres.' };
    }

    // 1. Obtener y validar sesión del cliente/salón profesional
    const sesion = await obtenerSesionCliente();

    if (!sesion || !sesion.usuario) {
      return {
        success: false,
        error: 'Debes iniciar sesión con tu cuenta de salón profesional para publicar una opinión sobre este producto.',
      };
    }

    const esAdmin = sesion.rol === 'ADMIN';
    const cliente = sesion.cliente;

    if (!esAdmin) {
      if (!cliente) {
        return {
          success: false,
          error: 'No se encontró el perfil de salón profesional asociado a tu usuario.',
        };
      }

      if (cliente.estadoCliente !== 'ACTIVO') {
        return {
          success: false,
          error: 'Tu cuenta de salón aún se encuentra en revisión. Solo los salones profesionales autorizados y activos pueden publicar reseñas.',
        };
      }
    }

    // 2. Extraer automáticamente los datos del salón y ubicación desde la base de datos
    let nombreSalon = 'Salón Profesional';
    let nombreAutor = 'Estilista Profesional';
    let localidad = 'Argentina';
    let clienteId: string | null = null;

    if (cliente) {
      clienteId = cliente.id;
      nombreSalon = cliente.salon?.trim() || cliente.nombre?.trim() || 'Salón Profesional';
      nombreAutor = cliente.nombre?.trim() ? `${cliente.nombre.trim()} ${cliente.apellido?.trim() || ''}`.trim() : 'Estilista';
      
      const ubicacionPartes = [];
      if (cliente.localidad?.trim()) ubicacionPartes.push(cliente.localidad.trim());
      if (cliente.provincia?.trim()) ubicacionPartes.push(cliente.provincia.trim());
      localidad = ubicacionPartes.length > 0 ? ubicacionPartes.join(', ') : 'Argentina';
    } else if (esAdmin) {
      nombreSalon = 'Steffen Cosmética Capilar (Oficial)';
      nombreAutor = 'Equipo Técnico Steffen';
      localidad = 'Buenos Aires, Argentina';
    }

    const rating = Math.max(1, Math.min(5, Math.round(Number(calificacion) || 5)));

    // 3. Verificar si el producto existe
    const productoExiste = await prisma.producto.findUnique({
      where: { id: productoId },
      select: { id: true },
    });

    if (!productoExiste) {
      return { success: false, error: 'El producto no existe o fue dado de baja.' };
    }

    // 4. Crear el comentario con estado verificado garantizado
    const nuevoComentario = await prisma.comentarioProducto.create({
      data: {
        productoId,
        clienteId,
        nombreSalon,
        nombreAutor,
        localidad,
        calificacion: rating,
        comentario: comentario.trim(),
        verificado: true,
      },
    });

    revalidatePath(`/catalogo/${productoId}`);
    revalidatePath('/catalogo');

    return {
      success: true,
      comentario: {
        id: nuevoComentario.id,
        nombreSalon: nuevoComentario.nombreSalon,
        nombreAutor: nuevoComentario.nombreAutor,
        localidad: nuevoComentario.localidad,
        calificacion: nuevoComentario.calificacion,
        comentario: nuevoComentario.comentario,
        verificado: nuevoComentario.verificado,
        createdAt: nuevoComentario.createdAt.toISOString(),
      },
    };
  } catch (error) {
    console.error('Error al agregar comentario de producto:', error);
    return {
      success: false,
      error: 'Ocurrió un error al guardar tu comentario. Por favor intentá nuevamente.',
    };
  }
}
