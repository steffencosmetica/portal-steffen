import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Rol } from '@prisma/client';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { ReglasDescuentoClient, ReglaDescuentoDTO } from '@/components/admin/ReglasDescuentoClient';
import Link from 'next/link';
import { ArrowLeft, Percent } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminReglasDescuentoPage() {
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

  // 2. Obtener todas las reglas de descuento
  const reglasDb = await prisma.reglaDeDescuento.findMany({
    orderBy: [
      { tipo: 'asc' },
      { orden: 'asc' },
      { diasDesde: 'asc' },
    ],
  });

  const reglasDTO: ReglaDescuentoDTO[] = reglasDb.map((r) => ({
    id: r.id,
    tipo: r.tipo,
    porcentaje: Number(r.porcentaje),
    diasDesde: r.diasDesde,
    diasHasta: r.diasHasta,
    montoDesde: r.montoDesde ? Number(r.montoDesde) : null,
    montoHasta: r.montoHasta ? Number(r.montoHasta) : null,
    activa: r.activa,
    orden: r.orden,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));

  return (
    <div
      id="admin-reglas-descuento-page"
      className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col justify-between p-4 md:p-8"
    >
      <div className="max-w-7xl mx-auto w-full space-y-8">
        <AdminHeader emailAdmin={user.email} />

        <main className="space-y-6">
          {/* Breadcrumb / Regresar */}
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500">
            <Link
              href="/admin"
              className="hover:text-gold-700 flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Panel Principal</span>
            </Link>
            <span>/</span>
            <span className="text-neutral-900">Reglas de Descuento</span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-gold-700 block">
                Configuración Comercial
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-neutral-900 tracking-tight mt-1">
              Escalas y Reglas de Descuento
            </h1>
            <p className="text-neutral-500 text-xs sm:text-sm mt-1 max-w-2xl">
              Administrá los porcentajes de descuento aplicados automáticamente para primer pedido y compras por reposición en función de los días transcurridos.
            </p>
          </div>

          <ReglasDescuentoClient reglasIniciales={reglasDTO} />
        </main>
      </div>

      <footer className="max-w-7xl mx-auto w-full py-6 text-center text-xs text-neutral-500 border-t border-neutral-200 mt-12">
        © {new Date().getFullYear()} Steffen Cosmética Capilar • Panel de Control Administrativo
      </footer>
    </div>
  );
}
