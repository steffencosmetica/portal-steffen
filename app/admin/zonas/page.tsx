import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Rol } from '@prisma/client';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { ZonasListClient } from '@/components/admin/ZonasListClient';
import { MapPin, Plus } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminZonasPage() {
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

  // 2. Fetch de todas las zonas con distribuidor y conteo de clientes
  const zonasDb = await prisma.zona.findMany({
    orderBy: [
      { provincia: 'asc' },
      { localidad: 'asc' },
    ],
    include: {
      distribuidor: true,
      _count: {
        select: {
          clientes: true,
        },
      },
    },
  });

  const zonasDTO = zonasDb.map((z) => ({
    id: z.id,
    provincia: z.provincia,
    localidad: z.localidad,
    estado: z.estado,
    distribuidorId: z.distribuidorId,
    latitud: z.latitud,
    longitud: z.longitud,
    distribuidor: z.distribuidor
      ? {
          id: z.distribuidor.id,
          nombre: z.distribuidor.nombre,
          empresa: z.distribuidor.empresa,
          whatsapp: z.distribuidor.whatsapp,
          estado: z.distribuidor.estado,
        }
      : null,
    clientesCount: z._count.clientes,
  }));

  return (
    <div id="admin-zonas-root" className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col justify-between p-4 md:p-8">
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
                <span className="text-neutral-900 font-semibold">Zonas Geográficas</span>
              </div>
              <h1 className="text-2xl font-black text-neutral-900 tracking-tight flex items-center gap-2.5">
                <MapPin className="w-6 h-6 text-gold-600" />
                <span>Zonas Geográficas</span>
              </h1>
              <p className="text-xs text-neutral-500 mt-0.5">
                Configuración de cobertura geográfica para determinar venta directa o derivación a distribuidores.
              </p>
            </div>

            <Link
              href="/admin/zonas/nuevo"
              className="inline-flex items-center justify-center gap-2 bg-gold-500 hover:bg-gold-600 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-all shadow-sm shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Zona</span>
            </Link>
          </div>

          {/* Listado Reactivo */}
          <ZonasListClient zonasIniciales={zonasDTO} />
        </main>
      </div>

      <footer className="max-w-7xl mx-auto w-full py-6 text-center text-xs text-neutral-400 border-t border-neutral-200 mt-12">
        Portal Profesional Steffen • Módulo de Zonas
      </footer>
    </div>
  );
}
