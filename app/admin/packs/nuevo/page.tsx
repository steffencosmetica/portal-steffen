import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Rol } from '@prisma/client';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { PackForm, ProductoOption } from '@/components/admin/PackForm';
import { ArrowLeft, PackagePlus } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminNuevoPackPage() {
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

  // Traer productos para el selector
  const productosDB = await prisma.producto.findMany({
    orderBy: { nombre: 'asc' },
  });

  const productosDisponibles: ProductoOption[] = productosDB.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    categoria: p.categoria,
    presentacion: p.presentacion,
    precioPss: Number(p.precioPss),
    precioEcommerce: Number(p.precioEcommerce),
    precioReventa: p.precioReventa ? Number(p.precioReventa) : null,
    stock: p.stock,
    activo: p.activo,
    imagen: p.imagen,
  }));

  return (
    <div id="admin-nuevo-pack-root" className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col justify-between p-4 md:p-8">
      <div className="max-w-7xl mx-auto w-full space-y-8">
        <AdminHeader titulo="Nuevo Pack / Combo" emailAdmin={user.email} />

        <main className="space-y-6">
          <div>
            <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1">
              <Link href="/admin/packs" className="hover:text-gold-700 transition-colors flex items-center gap-1">
                <ArrowLeft className="w-3 h-3" />
                <span>Volver a Packs</span>
              </Link>
            </div>
            <h2 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
              <PackagePlus className="w-5 h-5 text-gold-600" />
              Crear Nuevo Pack Promocional
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Definí el precio promocional, seleccioná los productos componentes y establecé la vigencia del combo.
            </p>
          </div>

          <PackForm productosDisponibles={productosDisponibles} />
        </main>
      </div>

      <footer className="max-w-7xl mx-auto w-full text-center text-xs text-neutral-400 py-6 border-t border-neutral-200 mt-12">
        <p>Panel de Administración Steffen • Alta de Packs</p>
      </footer>
    </div>
  );
}
