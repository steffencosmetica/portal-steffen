// Almacenamiento de imágenes de productos en Supabase Storage (bucket 'productos-imagenes').
// Módulo interno del servidor: NO lleva 'use server', por lo que no se expone como Server Action.
// Quien lo invoque debe haber verificado previamente el rol ADMIN.

import { createAdminSupabaseClient } from '@/lib/supabase/server';

export interface SubirImagenResultado {
  success: boolean;
  url?: string;
  error?: string;
}

export const MIME_TYPES_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

const EXTENSIONES_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

/**
 * Función auxiliar para subir un Buffer de imagen directamente a Supabase Storage.
 * Reutilizada por subida individual y por carga masiva con URLs externas.
 */
export async function almacenarBufferImagenProducto(
  buffer: Buffer,
  mimeType: string
): Promise<SubirImagenResultado> {
  try {
    if (!MIME_TYPES_PERMITIDOS.includes(mimeType)) {
      return {
        success: false,
        error: `Formato de imagen no permitido (${mimeType}). Solo se aceptan JPEG, PNG o WebP.`,
      };
    }

    if (buffer.length > MAX_BYTES) {
      const tamanoMb = (buffer.length / (1024 * 1024)).toFixed(2);
      return {
        success: false,
        error: `El archivo supera el límite de 5 MB (tamaño actual: ${tamanoMb} MB).`,
      };
    }

    const extension = EXTENSIONES_MIME[mimeType] || '.jpg';
    const nombreArchivo = `producto-${crypto.randomUUID()}${extension}`;

    const supabaseAdmin = createAdminSupabaseClient();
    const { error: uploadError } = await supabaseAdmin.storage
      .from('productos-imagenes')
      .upload(nombreArchivo, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error('Error al subir imagen a Supabase Storage:', uploadError);
      return {
        success: false,
        error: `Error al almacenar la imagen: ${uploadError.message}`,
      };
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('productos-imagenes')
      .getPublicUrl(nombreArchivo);

    if (!urlData || !urlData.publicUrl) {
      return {
        success: false,
        error: 'No se pudo generar la URL pública de la imagen subida.',
      };
    }

    return {
      success: true,
      url: urlData.publicUrl,
    };
  } catch (error) {
    console.error('Error inesperado en almacenarBufferImagenProducto:', error);
    return {
      success: false,
      error: 'Error inesperado al guardar la imagen en el almacenamiento.',
    };
  }
}
