import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Rol } from '@prisma/client';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { DistribuidoresListClient } from '@/components/admin/DistribuidoresListClient';
import { ArrowLeft, Truck, Plus } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminDistribuidoresPage() {
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

  // 2. Fetch de todos los distribuidores con el conteo de zonas vinculadas
  const distribuidoresDb = await prisma.distribuidor.findMany({
    orderBy: {
      nombre: 'asc',
    },
    include: {
      _count: {
        select: {
          zonas: true,
        },
      },
    },
  });

  const distribuidoresDTO = distribuidoresDb.map((d) => ({
    id: d.id,
    nombre: d.nombre,
    empresa: d.empresa,
    provincia: d.provincia,
    localidades: d.localidades,
    whatsapp: d.whatsapp,
    estado: d.estado,
    observaciones: d.observaciones,
    zonasCount: d._count.zonas,
  }));

  return (
    <div id="admin-distribuidores-root" className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col justify-between p-4 md:p-8">
      <div className="max-w-7xl mx-auto w-full space-y-8">
        <AdminHeader emailAdmin={user.email} />

        <main className="space-y-6">
          {/* Breadcrumbs y Título */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1">
                <Link href="/admin" className="hover:text-gold-700 transition-colors">
                  Panel Admin
                </Link>
                <span>/</span>
                <span className="text-neutral-900 font-semibold">Distribuidores Oficiales</span>
              </div>
              <h1 className="text-2xl font-black text-neutral-900 tracking-tight flex items-center gap-2.5">
                <Truck className="w-6 h-6 text-gold-600" />
                <span>Distribuidores Oficiales</span>
              </h1>
              <p className="text-xs text-neutral-500 mt-0.5">
                Gestión de representantes mayoristas y redes de cobertura geográfica de Steffen.
              </p>
            </div>

            <Link
              href="/admin/distribuidores/nuevo"
              className="inline-flex items-center justify-center gap-2 bg-gold-500 hover:bg-gold-600 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-all shadow-sm shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Distribuidor</span>
            </Link>
          </div>

          {/* Listado Reactivo */}
          <DistribuidoresListClient distribuidoresIniciales={distribuidoresDTO} />
        </main>
      </div>

      <footer className="max-w-7xl mx-auto w-full py-6 text-center text-xs text-neutral-400 border-t border-neutral-200 mt-12">
        Portal Profesional Steffen • Módulo de Distribuidores
      </footer>
    </div>
  );
}
