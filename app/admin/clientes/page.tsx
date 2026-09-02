import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Rol } from '@prisma/client';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { ClientesListClient, ClienteListItemDTO } from '@/components/admin/ClientesListClient';

export const dynamic = 'force-dynamic';

export default async function AdminClientesPage() {
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

  // 2. Fetch de todos los clientes con su zona
  const clientesDB = await prisma.cliente.findMany({
    orderBy: [
      { fechaRegistro: 'desc' },
    ],
    include: {
      zona: true,
      _count: {
        select: { pedidos: true },
      },
    },
  });

  // Serializar DTOs limpios
  const clientes: ClienteListItemDTO[] = clientesDB.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    apellido: c.apellido,
    salon: c.salon,
    whatsapp: c.whatsapp,
    email: c.email,
    provincia: c.provincia,
    localidad: c.localidad,
    tipoDeNegocio: c.tipoDeNegocio,
    estadoCliente: c.estadoCliente,
    fechaRegistro: c.fechaRegistro.toISOString(),
    zona: c.zona
      ? {
          id: c.zona.id,
          provincia: c.zona.provincia,
          localidad: c.zona.localidad,
          estado: c.zona.estado,
        }
      : null,
    cantidadPedidos: c._count.pedidos,
  }));

  return (
    <div id="admin-clientes-root" className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col justify-between p-4 md:p-8">
      <div className="max-w-7xl mx-auto w-full space-y-8">
        <AdminHeader titulo="Gestión de Clientes y Salones" emailAdmin={user.email} />

        <main className="space-y-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 tracking-tight">
              Directorio de Clientes y Salones Profesionales
            </h1>
            <p className="text-neutral-500 text-sm mt-1">
              Aprobá cuentas de estilistas, asigná zonas geográficas y gestioná el estado comercial de los salones.
            </p>
          </div>

          <ClientesListClient clientesIniciales={clientes} />
        </main>
      </div>

      <footer className="max-w-7xl mx-auto w-full py-6 text-center text-xs text-neutral-500 border-t border-neutral-200 mt-12">
        © {new Date().getFullYear()} Steffen Cosmética Capilar • Panel de Control Administrativo
      </footer>
    </div>
  );
}
