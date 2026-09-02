import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Rol } from '@prisma/client';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { ProductoForm } from '@/components/admin/ProductoForm';
import { ArrowLeft, PackagePlus } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminNuevoProductoPage() {
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

  return (
    <div id="admin-nuevo-producto-root" className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col justify-between p-4 md:p-8">
      <div className="max-w-7xl mx-auto w-full space-y-8">
        <AdminHeader titulo="Nuevo Producto" emailAdmin={user.email} />

        <main className="space-y-6">
          {/* Navegación de migas de pan y Título */}
          <div>
            <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1">
              <Link href="/admin/productos" className="hover:text-gold-700 transition-colors flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver al Catálogo</span>
              </Link>
              <span>/</span>
              <span className="text-neutral-700 font-medium">Nuevo Producto</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-neutral-900 tracking-tight flex items-center gap-2.5">
              <PackagePlus className="w-7 h-7 text-gold-600" />
              <span>Incorporar Nuevo Producto al Catálogo</span>
            </h1>
            <p className="text-xs text-neutral-500 mt-1">
              Completá los datos técnicos, subí la fotografía y definí los valores sugeridos para salones profesionales.
            </p>
          </div>

          {/* Formulario Reutilizable */}
          <ProductoForm modo="crear" />
        </main>
      </div>

      <footer className="max-w-7xl mx-auto w-full py-6 text-center text-xs text-neutral-500 border-t border-neutral-200 mt-12">
        © {new Date().getFullYear()} Steffen Cosmética Capilar • Panel de Control Administrativo
      </footer>
    </div>
  );
}
