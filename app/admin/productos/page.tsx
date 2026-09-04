import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Rol } from '@prisma/client';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { ProductosListClient, ProductoListItemDTO } from '@/components/admin/ProductosListClient';

export const dynamic = 'force-dynamic';

export default async function AdminProductosPage() {
  // 1. Chequeo explícito de rol ADMIN en el servidor
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

  // 2. Fetch de todos los productos (activos e inactivos)
  const productosDB = await prisma.producto.findMany({
    orderBy: [
      { ordenVisualizacion: 'asc' },
      { categoria: 'asc' },
      { nombre: 'asc' },
    ],
  });

  // Serializar DTOs limpios
  const productos: ProductoListItemDTO[] = productosDB.map((p) => ({
    id: p.id,
    codigo: p.codigo,
    nombre: p.nombre,
    categoria: p.categoria,
    subcategoria: p.subcategoria,
    presentacion: p.presentacion,
    imagen: p.imagen,
    precioPss: Number(p.precioPss),
    precioEcommerce: Number(p.precioEcommerce),
    precioReventa: p.precioReventa ? Number(p.precioReventa) : null,
    stock: p.stock,
    activo: p.activo,
    destacado: p.destacado,
    recomendado: p.recomendado,
    ordenVisualizacion: p.ordenVisualizacion,
  }));

  return (
    <div id="admin-productos-root" className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col justify-between p-4 md:p-8">
      <div className="max-w-7xl mx-auto w-full space-y-8">
        <AdminHeader titulo="Catálogo de Productos" emailAdmin={user.email} />

        <main className="space-y-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 tracking-tight">
              Catálogo y Administración de Productos
            </h1>
            <p className="text-neutral-500 text-sm mt-1">
              Creá, editá y gestioná las imágenes, precios salón profesional, stock y visibilidad de las líneas profesionales Steffen.
            </p>
          </div>

          <ProductosListClient productosIniciales={productos} />
        </main>
      </div>

      <footer className="max-w-7xl mx-auto w-full py-6 text-center text-xs text-neutral-500 border-t border-neutral-200 mt-12">
        © {new Date().getFullYear()} Steffen Cosmética Capilar • Panel de Control Administrativo
      </footer>
    </div>
  );
}
