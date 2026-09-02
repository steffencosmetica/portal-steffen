import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Rol } from '@prisma/client';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { DistribuidorForm } from '@/components/admin/DistribuidorForm';

export const dynamic = 'force-dynamic';

interface AdminDistribuidorDetallePageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminDistribuidorDetallePage({ params }: AdminDistribuidorDetallePageProps) {
  const { id: distribuidorId } = await params;

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

  // 2. Fetch del Distribuidor y sus zonas asignadas
  const distribuidor = await prisma.distribuidor.findUnique({
    where: { id: distribuidorId },
    include: {
      zonas: {
        orderBy: {
          localidad: 'asc',
        },
      },
    },
  });

  if (!distribuidor) {
    notFound();
  }

  const distribuidorDTO = {
    id: distribuidor.id,
    nombre: distribuidor.nombre,
    empresa: distribuidor.empresa,
    provincia: distribuidor.provincia,
    localidades: distribuidor.localidades,
    whatsapp: distribuidor.whatsapp,
    estado: distribuidor.estado,
    observaciones: distribuidor.observaciones,
    zonas: distribuidor.zonas.map((z) => ({
      id: z.id,
      provincia: z.provincia,
      localidad: z.localidad,
      estado: z.estado,
    })),
  };

  return (
    <div id="admin-distribuidor-detalle-root" className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col justify-between p-4 md:p-8">
      <div className="max-w-7xl mx-auto w-full space-y-8">
        <AdminHeader emailAdmin={user.email} />

        <main className="space-y-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <Link href="/admin" className="hover:text-gold-700 transition-colors">
              Panel Admin
            </Link>
            <span>/</span>
            <Link href="/admin/distribuidores" className="hover:text-gold-700 transition-colors">
              Distribuidores Oficiales
            </Link>
            <span>/</span>
            <span className="text-neutral-900 font-semibold">{distribuidor.nombre}</span>
          </div>

          <DistribuidorForm distribuidorInicial={distribuidorDTO} />
        </main>
      </div>

      <footer className="max-w-7xl mx-auto w-full py-6 text-center text-xs text-neutral-400 border-t border-neutral-200 mt-12">
        Portal Profesional Steffen • Edición de Distribuidor
      </footer>
    </div>
  );
}
