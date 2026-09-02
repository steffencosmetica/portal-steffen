import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Rol } from '@prisma/client';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { PedidosListClient, PedidoListItemDTO } from '@/components/admin/PedidosListClient';

export const dynamic = 'force-dynamic';

export default async function AdminPedidosPage() {
  // 1. Chequeo explícito de rol ADMIN en el servidor
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

  // 2. Fetch de todos los pedidos ordenados por fecha descendente
  const pedidosDB = await prisma.pedido.findMany({
    where: {
      estado: {
        not: 'CARRITO',
      },
    },
    orderBy: {
      fecha: 'desc',
    },
    include: {
      cliente: true,
      items: true,
    },
  });

  // Serializar DTOs limpios (Prisma Decimal -> number)
  const pedidos: PedidoListItemDTO[] = pedidosDB.map((p) => ({
    id: p.id,
    numeroPedido: p.numeroPedido,
    fecha: p.fecha.toISOString(),
    estado: p.estado,
    subtotalPss: Number(p.subtotalPss),
    descuentoAplicado: Number(p.descuentoAplicado),
    porcentajeDescuento: Number(p.porcentajeDescuento),
    total: Number(p.total),
    totalUnidades: p.items.reduce((acc, curr) => acc + curr.cantidad, 0),
    cliente: {
      id: p.cliente.id,
      nombre: p.cliente.nombre,
      apellido: p.cliente.apellido,
      salon: p.cliente.salon,
      whatsapp: p.cliente.whatsapp,
      localidad: p.cliente.localidad,
      provincia: p.cliente.provincia,
    },
  }));

  return (
    <div id="admin-pedidos-root" className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col justify-between p-4 md:p-8">
      <div className="max-w-7xl mx-auto w-full space-y-8">
        <AdminHeader titulo="Gestión de Pedidos" emailAdmin={user.email} />

        <main className="space-y-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 tracking-tight">
              Listado de Pedidos de Salones
            </h1>
            <p className="text-neutral-500 text-sm mt-1">
              Monitoreá, filtrá y administrá el estado de los pedidos recibidos directamente de fábrica.
            </p>
          </div>

          <PedidosListClient pedidosIniciales={pedidos} />
        </main>
      </div>

      <footer className="max-w-7xl mx-auto w-full py-6 text-center text-xs text-neutral-500 border-t border-neutral-200 mt-12">
        © {new Date().getFullYear()} Steffen Cosmética Capilar • Panel de Control Administrativo
      </footer>
    </div>
  );
}
