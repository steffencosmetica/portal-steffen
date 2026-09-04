import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Rol } from '@prisma/client';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { ProductoForm } from '@/components/admin/ProductoForm';
import { ArrowLeft, Clock, Edit } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface AdminProductoDetallePageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminProductoDetallePage({ params }: AdminProductoDetallePageProps) {
  const { id: productoId } = await params;

  // 1. Chequeo de rol ADMIN en el servidor
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const usuario = await prisma.usuario.findUnique({
    where: { authUserId: user.id },
  });

  if (!usuario || usuario.rol !== Rol.ADMIN) {
    redirect('/catalogo');
  }

  // 2. Fetch del Producto
  const producto = (await prisma.producto.findUnique({
    where: { id: productoId },
  })) as any;

  if (!producto) {
    notFound();
  }

  return (
    <div id="admin-producto-detalle-root" className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col justify-between p-4 md:p-8">
      <div className="max-w-7xl mx-auto w-full space-y-8">
        <AdminHeader titulo={`Editar: ${producto.nombre}`} emailAdmin={user.email} />

        <main className="space-y-6">
          {/* Navegación de migas de pan y Título */}
          <div>
            <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1">
              <Link href="/admin/productos" className="hover:text-gold-700 transition-colors flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver a Productos</span>
              </Link>
              <span>/</span>
              <span className="text-neutral-700 font-medium">Editar Producto</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-neutral-900 tracking-tight flex items-center gap-2.5">
              <Edit className="w-7 h-7 text-gold-600" />
              <span>Editar Producto: {producto.nombre}</span>
            </h1>
            <p className="text-xs text-neutral-500 mt-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gold-600" />
              ID del Producto: <span className="font-mono text-neutral-700">{producto.id}</span>
            </p>
          </div>

          {/* Formulario Reutilizable con Datos Precargados */}
          <ProductoForm
            modo="editar"
            productoInicial={{
              id: producto.id,
              codigo: producto.codigo || '',
              nombre: producto.nombre,
              categoria: producto.categoria,
              subcategoria: producto.subcategoria || '',
              descripcion: producto.descripcion,
              modoUso: producto.modoUso || '',
              rendimientoSalon: producto.rendimientoSalon || '',
              imagen: producto.imagen,
              presentacion: producto.presentacion,
              precioPss: Number(producto.precioPss),
              precioEcommerce: Number(producto.precioEcommerce),
              precioReventa: producto.precioReventa ? Number(producto.precioReventa) : null,
              stock: producto.stock,
              variantes: producto.variantes || null,
              ordenVisualizacion: producto.ordenVisualizacion,
              destacado: producto.destacado,
              recomendado: producto.recomendado,
              activo: producto.activo,
            }}
          />
        </main>
      </div>

      <footer className="max-w-7xl mx-auto w-full py-6 text-center text-xs text-neutral-500 border-t border-neutral-200 mt-12">
        © {new Date().getFullYear()} Steffen Cosmética Capilar • Panel de Control Administrativo
      </footer>
    </div>
  );
}
