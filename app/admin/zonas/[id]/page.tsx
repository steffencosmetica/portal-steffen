import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Rol } from '@prisma/client';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { ZonaForm } from '@/components/admin/ZonaForm';

export const dynamic = 'force-dynamic';

interface AdminZonaDetallePageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminZonaDetallePage({ params }: AdminZonaDetallePageProps) {
  const { id: zonaId } = await params;

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

  // 2. Fetch de la Zona y conteo de clientes
  const zona = await prisma.zona.findUnique({
    where: { id: zonaId },
    include: {
      distribuidor: true,
      _count: {
        select: {
          clientes: true,
        },
      },
    },
  });

  if (!zona) {
    notFound();
  }

  // 3. Fetch de distribuidores (activos + el asignado actualmente si estuviera inactivo)
  const distribuidoresActivos = await prisma.distribuidor.findMany({
    where: {
      OR: [
        { estado: 'ACTIVO' },
        ...(zona.distribuidorId ? [{ id: zona.distribuidorId }] : []),
      ],
    },
    orderBy: {
      nombre: 'asc',
    },
    select: {
      id: true,
      nombre: true,
      empresa: true,
      provincia: true,
      estado: true,
    },
  });

  const zonaDTO = {
    id: zona.id,
    provincia: zona.provincia,
    localidad: zona.localidad,
    estado: zona.estado,
    distribuidorId: zona.distribuidorId,
    latitud: zona.latitud,
    longitud: zona.longitud,
    clientesCount: zona._count.clientes,
  };

  return (
    <div id="admin-zona-detalle-root" className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col justify-between p-4 md:p-8">
      <div className="max-w-7xl mx-auto w-full space-y-8">
        <AdminHeader emailAdmin={user.email} />

        <main className="space-y-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <Link href="/admin" className="hover:text-gold-700 transition-colors">
              Panel Admin
            </Link>
            <span>/</span>
            <Link href="/admin/zonas" className="hover:text-gold-700 transition-colors">
              Zonas Geográficas
            </Link>
            <span>/</span>
            <span className="text-neutral-900 font-semibold">{zona.localidad}, {zona.provincia}</span>
          </div>

          <ZonaForm
            zonaInicial={zonaDTO}
            distribuidoresActivos={distribuidoresActivos}
          />
        </main>
      </div>

      <footer className="max-w-7xl mx-auto w-full py-6 text-center text-xs text-neutral-400 border-t border-neutral-200 mt-12">
        Portal Profesional Steffen • Edición de Zona Geográfica
      </footer>
    </div>
  );
}
