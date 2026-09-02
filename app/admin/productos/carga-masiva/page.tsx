import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Rol } from '@prisma/client';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { CargaMasivaClient } from '@/components/admin/CargaMasivaClient';
import { ArrowLeft, FileSpreadsheet } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminCargaMasivaProductosPage() {
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
    <div id="admin-carga-masiva-root" className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col justify-between p-4 md:p-8">
      <div className="max-w-7xl mx-auto w-full space-y-8">
        <AdminHeader titulo="Carga Masiva" emailAdmin={user.email} />

        <main className="space-y-6">
          {/* Migas de pan y Encabezado de Página */}
          <div>
            <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1">
              <Link href="/admin/productos" className="hover:text-gold-700 transition-colors flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver al Catálogo</span>
              </Link>
              <span>/</span>
              <span className="text-neutral-700 font-medium">Carga Masiva</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-neutral-900 tracking-tight flex items-center gap-2.5">
              <FileSpreadsheet className="w-7 h-7 text-emerald-600" />
              <span>Importación Masiva de Productos</span>
            </h1>
            <p className="text-xs text-neutral-500 mt-1">
              Descargá la plantilla Excel oficial, completá los datos de tus productos e importalos o actualizalos por código en un solo paso.
            </p>
          </div>

          {/* Componente Interactivo de Carga Masiva */}
          <CargaMasivaClient />
        </main>
      </div>

      <footer className="max-w-7xl mx-auto w-full py-6 text-center text-xs text-neutral-500 border-t border-neutral-200 mt-12">
        © {new Date().getFullYear()} Steffen Cosmética Capilar • Panel de Control Administrativo
      </footer>
    </div>
  );
}
