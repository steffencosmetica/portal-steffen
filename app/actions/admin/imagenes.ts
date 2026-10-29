'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { Rol } from '@prisma/client';
import {
  almacenarBufferImagenProducto,
  MAX_BYTES,
  MIME_TYPES_PERMITIDOS,
  type SubirImagenResultado,
} from '@/lib/services/imagenesProducto';

/**
 * Server Action para subir imágenes de productos a Supabase Storage (bucket 'productos-imagenes').
 * Implementa chequeo estricto de rol ADMIN en el servidor y validaciones de seguridad de tipo y tamaño.
 * Utiliza el cliente de servicio (Service Role) en el servidor para no exponer credenciales admin al navegador.
 */
export async function subirImagenProductoAction(formData: FormData): Promise<SubirImagenResultado> {
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

    // 2. Chequeo de rol ADMIN en PostgreSQL (Defensa en profundidad)
    const usuario = await prisma.usuario.findUnique({
      where: { authUserId: user.id },
    });

    if (!usuario || usuario.rol !== Rol.ADMIN) {
      console.warn(
        `[SECURITY] Intento no autorizado de subir imagen por usuario ${user.id} con rol ${usuario?.rol}`
      );
      return {
        success: false,
        error: 'Acceso denegado. Se requieren permisos de Administrador.',
      };
    }

    // 3. Extraer el archivo del FormData
    const file = (formData.get('imagen') || formData.get('file')) as File | null;

    if (!file || !(file instanceof File) || file.size === 0) {
      return {
        success: false,
        error: 'No se ha seleccionado ningún archivo de imagen válido.',
      };
    }

    // 4. Validar en el servidor el tipo MIME (nunca confiar en el accept del cliente)
    if (!MIME_TYPES_PERMITIDOS.includes(file.type)) {
      return {
        success: false,
        error: `Formato de imagen no permitido (${file.type}). Solo se aceptan JPEG, PNG o WebP.`,
      };
    }

    // 5. Validar en el servidor el tamaño máximo (5MB)
    if (file.size > MAX_BYTES) {
      const tamanoMb = (file.size / (1024 * 1024)).toFixed(2);
      return {
        success: false,
        error: `El archivo supera el límite de 5 MB (tamaño actual: ${tamanoMb} MB).`,
      };
    }

    // 6. Convertir a buffer para la subida
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 7. Subida mediante cliente admin con Service Role
    return await almacenarBufferImagenProducto(buffer, file.type);
  } catch (error) {
    console.error('Error inesperado en subirImagenProductoAction:', error);
    return {
      success: false,
      error: 'Ocurrió un error inesperado en el servidor al procesar la imagen.',
    };
  }
}

