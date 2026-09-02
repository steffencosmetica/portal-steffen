import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Rol } from '@prisma/client';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { PacksListClient, PackAdminView } from '@/components/admin/PacksListClient';
import { Package, ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminPacksPage() {
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

  const packsDB = (await prisma.pack.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      items: {
        include: {
          producto: true,
        },
      },
    },
  })) as any[];

  const packs: PackAdminView[] = packsDB.map((p: any) => ({
    id: p.id,
    nombre: p.nombre,
    descripcion: p.descripcion,
    imagen: p.imagen,
    etiqueta:
      p.etiqueta === 'Vender más en mi salón'
        ? 'Reventa'
        : p.etiqueta === 'Rutinas segun necesidad'
        ? 'Rutinas de tratamiento'
        : p.etiqueta || null,
    precioPromocional: Number(p.precioPromocional),
    precioPssEquivalente: p.precioPssEquivalente ? Number(p.precioPssEquivalente) : null,
    descuento: p.descuento ? Number(p.descuento) : null,
    fechaInicio: p.fechaInicio ? new Date(p.fechaInicio).toISOString() : null,
    fechaFin: p.fechaFin ? new Date(p.fechaFin).toISOString() : null,
    activo: p.activo,
    destacado: p.destacado,
    createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString(),
    items: ((p.items || []) as any[]).map((it: any) => ({
      id: it.id,
      productoId: it.productoId,
      cantidad: it.cantidad,
      producto: {
        id: it.producto?.id || it.productoId,
        nombre: it.producto?.nombre || '',
        presentacion: it.producto?.presentacion || '',
        precioPss: Number(it.producto?.precioPss || 0),
        stock: it.producto?.stock ?? 0,
        activo: it.producto?.activo ?? true,
      },
    })),
  }));

  return (
    <div id="admin-packs-root" className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col justify-between p-4 md:p-8">
      <div className="max-w-7xl mx-auto w-full space-y-8">
        <AdminHeader titulo="Packs y Combos Promocionales" emailAdmin={user.email} />

        <main className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1">
                <Link href="/admin" className="hover:text-gold-700 transition-colors flex items-center gap-1">
                  <ArrowLeft className="w-3 h-3" />
                  <span>Volver al Panel General</span>
                </Link>
              </div>
              <h2 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-gold-600" />
                Gestión de Packs y Promociones
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Configurá combos especiales con precio promocional profesional y disponibilidad condicionada al stock de sus productos componentes.
              </p>
            </div>
          </div>

          <PacksListClient packsIniciales={packs} />
        </main>
      </div>

      <footer className="max-w-7xl mx-auto w-full text-center text-xs text-neutral-400 py-6 border-t border-neutral-200 mt-12">
        <p>Panel de Administración Steffen • Gestión de Combos y Packs</p>
      </footer>
    </div>
  );
}
