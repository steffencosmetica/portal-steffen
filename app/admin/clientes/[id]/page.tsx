import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Rol } from '@prisma/client';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { ClienteDetalleForm } from '@/components/admin/ClienteDetalleForm';
import { ArrowLeft, Clock } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface AdminClienteDetallePageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminClienteDetallePage({ params }: AdminClienteDetallePageProps) {
  const { id: clienteId } = await params;

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

  // 2. Fetch completo del Cliente, sus zonas disponibles y su historial de pedidos
  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    include: {
      zona: true,
      pedidos: {
        where: {
          estado: { not: 'CARRITO' },
        },
        orderBy: {
          fecha: 'desc',
        },
        include: {
          items: true,
        },
      },
    },
  });

  if (!cliente) {
    notFound();
  }

  // 3. Fetch de todas las zonas para el selector
  const zonas = await prisma.zona.findMany({
    orderBy: [
      { provincia: 'asc' },
      { localidad: 'asc' },
    ],
  });

  return (
    <div id="admin-cliente-detalle-root" className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col justify-between p-4 md:p-8">
      <div className="max-w-7xl mx-auto w-full space-y-8">
        <AdminHeader titulo={`Salón: ${cliente.salon}`} emailAdmin={user.email} />

        <main className="space-y-6">
          {/* Navegación de migas de pan y Título */}
          <div>
            <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1">
              <Link href="/admin/clientes" className="hover:text-gold-700 transition-colors flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver a Clientes</span>
              </Link>
              <span>/</span>
              <span className="text-neutral-700 font-medium">{cliente.salon}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-neutral-900 tracking-tight">
              Ficha del Salón Profesional
            </h1>
            <p className="text-xs text-neutral-500 mt-0.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gold-600" />
              ID de Registro: <span className="font-mono text-neutral-700">{cliente.id}</span>
            </p>
          </div>

          {/* Formulario y Secciones de Detalle */}
          <ClienteDetalleForm
            cliente={{
              id: cliente.id,
              nombre: cliente.nombre,
              apellido: cliente.apellido,
              salon: cliente.salon,
              whatsapp: cliente.whatsapp,
              email: cliente.email,
              provincia: cliente.provincia,
              localidad: cliente.localidad,
              pais: cliente.pais,
              tipoDeNegocio: cliente.tipoDeNegocio,
              instagram: cliente.instagram,
              cuit: cliente.cuit,
              yaComproSteffen: cliente.yaComproSteffen,
              comoConocioSteffen: cliente.comoConocioSteffen,
              estadoCliente: cliente.estadoCliente,
              zonaId: cliente.zonaId,
              fechaRegistro: cliente.fechaRegistro.toISOString(),
            }}
            zonasDisponibles={zonas.map((z) => ({
              id: z.id,
              provincia: z.provincia,
              localidad: z.localidad,
              estado: z.estado,
            }))}
            pedidosHistorial={cliente.pedidos.map((p) => ({
              id: p.id,
              numeroPedido: p.numeroPedido,
              fecha: p.fecha.toISOString(),
              estado: p.estado,
              total: Number(p.total),
              totalItems: p.items.reduce((acc, curr) => acc + curr.cantidad, 0),
            }))}
          />
        </main>
      </div>

      <footer className="max-w-7xl mx-auto w-full py-6 text-center text-xs text-neutral-500 border-t border-neutral-200 mt-12">
        © {new Date().getFullYear()} Steffen Cosmética Capilar • Panel de Control Administrativo
      </footer>
    </div>
  );
}
