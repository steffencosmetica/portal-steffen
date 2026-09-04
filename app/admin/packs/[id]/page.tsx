import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Rol } from '@prisma/client';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { PackForm, ProductoOption } from '@/components/admin/PackForm';
import { ArrowLeft, PackageCheck } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminEditarPackPage({ params }: PageProps) {
  const { id } = await params;

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

  const pack = (await prisma.pack.findUnique({
    where: { id },
    include: {
      items: true,
    },
  })) as any;

  if (!pack) {
    notFound();
  }

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

  const packInicial = {
    id: pack.id,
    nombre: pack.nombre,
    descripcion: pack.descripcion,
    imagen: pack.imagen,
    etiqueta:
      pack.etiqueta === 'Vender más en mi salón'
        ? 'Reventa'
        : pack.etiqueta === 'Rutinas segun necesidad'
        ? 'Rutinas de tratamiento'
        : pack.etiqueta || null,
    precioPromocional: Number(pack.precioPromocional),
    descuentoDistribuidor:
      pack.descuentoDistribuidor !== null && pack.descuentoDistribuidor !== undefined
        ? Number(pack.descuentoDistribuidor)
        : null,
    descuentoDirecto:
      pack.descuentoDirecto !== null && pack.descuentoDirecto !== undefined
        ? Number(pack.descuentoDirecto)
        : null,
    precioOriginal: pack.precioOriginal ? Number(pack.precioOriginal) : null,
    precioDistribuidor: pack.precioDistribuidor ? Number(pack.precioDistribuidor) : null,
    precioDirecto: pack.precioDirecto ? Number(pack.precioDirecto) : null,
    activo: pack.activo,
    destacado: pack.destacado,
    fechaInicio: pack.fechaInicio ? pack.fechaInicio.toISOString() : null,
    fechaFin: pack.fechaFin ? pack.fechaFin.toISOString() : null,
    items: ((pack.items || []) as any[]).map((it: any) => ({
      productoId: it.productoId,
      cantidad: it.cantidad,
    })),
  };

  return (
    <div id="admin-editar-pack-root" className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col justify-between p-4 md:p-8">
      <div className="max-w-7xl mx-auto w-full space-y-8">
        <AdminHeader titulo="Editar Pack" emailAdmin={user.email} />

        <main className="space-y-6">
          <div>
            <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1">
              <Link href="/admin/packs" className="hover:text-gold-700 transition-colors flex items-center gap-1">
                <ArrowLeft className="w-3 h-3" />
                <span>Volver a Packs</span>
              </Link>
            </div>
            <h2 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
              <PackageCheck className="w-5 h-5 text-gold-600" />
              Editar Combo Promocional: {pack.nombre}
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Modificá el precio promocional, la composición de productos o la vigencia temporal.
            </p>
          </div>

          <PackForm packInicial={packInicial} productosDisponibles={productosDisponibles} />
        </main>
      </div>

      <footer className="max-w-7xl mx-auto w-full text-center text-xs text-neutral-400 py-6 border-t border-neutral-200 mt-12">
        <p>Panel de Administración Steffen • Edición de Packs</p>
      </footer>
    </div>
  );
}
