'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Rol, Prisma } from '@prisma/client';
import { CATEGORIAS_PRODUCTO, CategoriaProducto } from '@/lib/constants/categorias';

export interface GuardarProductoData {
  codigo?: string | null;
  nombre: string;
  categoria: string;
  subcategoria?: string | null;
  etiqueta?: string | null;
  descripcion: string;
  imagen: string;
  presentacion: string;
  modoUso?: string | null;
  rendimientoSalon?: string | null;
  precioPss: number;
  precioEcommerce: number;
  precioReventa?: number | null;
  stock: number;
  variantes?: string | null;
  activo?: boolean;
  ordenVisualizacion?: number;
  destacado?: boolean;
  recomendado?: boolean;
}

export interface GuardarProductoResultado {
  success: boolean;
  productoId?: string;
  error?: string;
}

export interface CambiarEstadoActivoResultado {
  success: boolean;
  error?: string;
}

export interface EliminarProductoResultado {
  success: boolean;
  error?: string;
}

/**
 * Server Action para crear o actualizar un producto del catálogo profesional Steffen.
 * Aplica chequeo estricto de rol ADMIN en el servidor y validaciones de datos requeridas.
 */
export async function guardarProductoAction(
  productoId: string | null,
  data: GuardarProductoData
): Promise<GuardarProductoResultado> {
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
        `[SECURITY] Intento no autorizado de guardar producto por usuario ${user.id} con rol ${usuario?.rol}`
      );
      return {
        success: false,
        error: 'Acceso denegado. Se requieren permisos de Administrador.',
      };
    }

    // 3. Validaciones de negocio Server-Side
    const nombre = data.nombre?.trim();
    if (!nombre) {
      return { success: false, error: 'El nombre del producto es obligatorio.' };
    }

    if (!CATEGORIAS_PRODUCTO.includes(data.categoria as CategoriaProducto)) {
      return {
        success: false,
        error: `La categoría "${data.categoria}" no es válida. Categorías permitidas: ${CATEGORIAS_PRODUCTO.join(', ')}.`,
      };
    }

    const presentacion = data.presentacion?.trim();
    if (!presentacion) {
      return { success: false, error: 'La presentación del producto es obligatoria (ej: 250 ml, 1000 ml).' };
    }

    const descripcion = data.descripcion?.trim();
    if (!descripcion) {
      return { success: false, error: 'La descripción del producto es obligatoria.' };
    }

    const imagen = data.imagen?.trim();
    if (!imagen) {
      return { success: false, error: 'Debes seleccionar y subir una imagen para el producto.' };
    }

    const precioPss = Number(data.precioPss);
    if (isNaN(precioPss) || precioPss <= 0) {
      return { success: false, error: 'El Precio Salón Profesional debe ser un número mayor a 0.' };
    }

    const precioEcommerce = Number(data.precioEcommerce);
    if (isNaN(precioEcommerce) || precioEcommerce <= 0) {
      return { success: false, error: 'El Precio Público de Referencia (Ecommerce) debe ser un número mayor a 0.' };
    }

    const precioReventa = data.precioReventa !== undefined && data.precioReventa !== null && !isNaN(Number(data.precioReventa)) && Number(data.precioReventa) > 0
      ? Number(data.precioReventa)
      : null;

    const stock = Number(data.stock);
    if (isNaN(stock) || !Number.isInteger(stock) || stock < 0) {
      return { success: false, error: 'El stock debe ser un número entero mayor o igual a 0.' };
    }

    const ordenVisualizacion = Number.isInteger(Number(data.ordenVisualizacion))
      ? Math.max(0, Number(data.ordenVisualizacion))
      : 0;

    const codigo = data.codigo?.trim() || null;
    if (codigo) {
      const codigoExistente = await prisma.producto.findUnique({
        where: { codigo },
      });
      if (codigoExistente && codigoExistente.id !== productoId) {
        return {
          success: false,
          error: `Ya existe otro producto con el código "${codigo}". El código debe ser único.`,
        };
      }
    }

    const subcategoria = data.subcategoria?.trim() || null;
    const etiqueta = data.etiqueta?.trim() || null;
    const modoUso = data.modoUso?.trim() || null;
    const rendimientoSalon = data.rendimientoSalon?.trim() || null;
    const variantes = data.variantes !== undefined ? data.variantes : null;
    const activo = data.activo ?? true;
    const destacado = data.destacado ?? false;
    const recomendado = data.recomendado ?? false;

    // 4. Crear o Actualizar
    let idFinal = productoId;

    if (productoId) {
      // Validar existencia previa
      const existente = await prisma.producto.findUnique({
        where: { id: productoId },
      });

      if (!existente) {
        return { success: false, error: 'El producto que deseas editar no existe.' };
      }

      await (prisma.producto as any).update({
        where: { id: productoId },
        data: {
          codigo,
          nombre,
          categoria: data.categoria,
          subcategoria,
          etiqueta,
          descripcion,
          imagen,
          presentacion,
          modoUso,
          rendimientoSalon,
          precioPss: new Prisma.Decimal(precioPss),
          precioEcommerce: new Prisma.Decimal(precioEcommerce),
          precioReventa: precioReventa ? new Prisma.Decimal(precioReventa) : null,
          stock,
          variantes,
          activo,
          ordenVisualizacion,
          destacado,
          recomendado,
        },
      });
    } else {
      const nuevoProducto = await (prisma.producto as any).create({
        data: {
          codigo,
          nombre,
          categoria: data.categoria,
          subcategoria,
          etiqueta,
          descripcion,
          imagen,
          presentacion,
          modoUso,
          rendimientoSalon,
          precioPss: new Prisma.Decimal(precioPss),
          precioEcommerce: new Prisma.Decimal(precioEcommerce),
          precioReventa: precioReventa ? new Prisma.Decimal(precioReventa) : null,
          stock,
          variantes,
          activo,
          ordenVisualizacion,
          destacado,
          recomendado,
        },
      });
      idFinal = nuevoProducto.id;
    }

    // 5. Revalidar rutas
    revalidatePath('/');
    revalidatePath('/admin');
    revalidatePath('/admin/productos');
    if (idFinal) {
      revalidatePath(`/admin/productos/${idFinal}`);
    }
    revalidatePath('/catalogo');
    revalidatePath('/carrito');

    return {
      success: true,
      productoId: idFinal || undefined,
    };
  } catch (error) {
    console.error('Error al guardar producto:', error);
    return {
      success: false,
      error: 'Ocurrió un error inesperado al guardar el producto en la base de datos.',
    };
  }
}

/**
 * Server Action rápida para alternar el estado activo/inactivo de un producto directamente
 * desde la lista de administración sin abrir el formulario completo.
 */
export async function cambiarEstadoActivoProductoAction(
  productoId: string,
  activo: boolean
): Promise<CambiarEstadoActivoResultado> {
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
      return { success: false, error: 'Acceso denegado. Se requieren permisos de Administrador.' };
    }

    // 3. Validar existencia
    const existente = await prisma.producto.findUnique({
      where: { id: productoId },
    });

    if (!existente) {
      return { success: false, error: 'El producto no existe.' };
    }

    // 4. Actualizar estado activo
    await prisma.producto.update({
      where: { id: productoId },
      data: { activo },
    });

    // 5. Revalidar
    revalidatePath('/');
    revalidatePath('/admin');
    revalidatePath('/admin/productos');
    revalidatePath(`/admin/productos/${productoId}`);
    revalidatePath('/catalogo');

    return { success: true };
  } catch (error) {
    console.error('Error al cambiar estado activo del producto:', error);
    return {
      success: false,
      error: 'No se pudo actualizar el estado del producto.',
    };
  }
}

/**
 * Server Action para alternar rápidamente si un producto se muestra en el Home (destacado)
 * desde una casilla en el catálogo de productos de administración.
 */
export async function cambiarDestacadoProductoAction(
  productoId: string,
  destacado: boolean
): Promise<{ success: boolean; error?: string }> {
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
      return { success: false, error: 'Acceso denegado. Se requieren permisos de Administrador.' };
    }

    // 3. Validar existencia
    const existente = await prisma.producto.findUnique({
      where: { id: productoId },
    });

    if (!existente) {
      return { success: false, error: 'El producto no existe.' };
    }

    // 4. Actualizar estado destacado (casilla de Home)
    await prisma.producto.update({
      where: { id: productoId },
      data: { destacado },
    });

    // 5. Revalidar de inmediato la página principal y el catálogo
    revalidatePath('/');
    revalidatePath('/admin');
    revalidatePath('/admin/productos');
    revalidatePath(`/admin/productos/${productoId}`);
    revalidatePath('/catalogo');

    return { success: true };
  } catch (error) {
    console.error('Error al cambiar estado destacado del producto:', error);
    return {
      success: false,
      error: 'No se pudo actualizar la visibilidad en el Home del producto.',
    };
  }
}

/**
 * Server Action para eliminar permanentemente un producto del catálogo Steffen.
 * Valida autenticación y permisos de rol ADMIN.
 * Verifica previamente que el producto no forme parte de combos/packs promocionales.
 */
export async function eliminarProductoAction(
  productoId: string
): Promise<EliminarProductoResultado> {
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
      return { success: false, error: 'Acceso denegado. Se requieren permisos de Administrador.' };
    }

    // 3. Validar existencia del producto y dependencias en Packs
    const producto = await prisma.producto.findUnique({
      where: { id: productoId },
      include: {
        packItems: {
          include: {
            pack: true,
          },
        },
      },
    });

    if (!producto) {
      return { success: false, error: 'El producto a eliminar no existe o ya fue eliminado.' };
    }

    // 4. Chequear si forma parte de algún Pack/Combo promocional
    if (producto.packItems && producto.packItems.length > 0) {
      const nombresPacks = Array.from(new Set(producto.packItems.map((pi) => pi.pack.nombre))).join(', ');
      return {
        success: false,
        error: `No se puede eliminar "${producto.nombre}" porque forma parte de los siguientes packs/combos: "${nombresPacks}". Primero debes quitar el producto de esos packs o eliminar los combos.`,
      };
    }

    // 5. Eliminar el producto de la base de datos
    await prisma.producto.delete({
      where: { id: productoId },
    });

    // 6. Revalidar rutas del catálogo, administración y carrito
    revalidatePath('/admin');
    revalidatePath('/admin/productos');
    revalidatePath('/admin/packs');
    revalidatePath('/catalogo');
    revalidatePath('/carrito');

    return { success: true };
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    return {
      success: false,
      error: 'Ocurrió un error inesperado al intentar eliminar el producto de la base de datos.',
    };
  }
}

