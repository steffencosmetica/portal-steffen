import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Rol, EstadoCliente, EstadoPedido } from '@prisma/client';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { 
  ShoppingCart, 
  Users, 
  Package, 
  Boxes, 
  MapPin, 
  Truck, 
  Percent, 
  ArrowRight,
  Clock
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  // 1. Chequeo de rol ADMIN en el servidor
  let user = null;
  let usuario = null;

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    user = authUser;

    if (!user) {
      redirect('/login');
    }

    usuario = await prisma.usuario.findUnique({
      where: { authUserId: user.id },
    });

    if (!usuario && user.email) {
      const usuarioPorEmail = await prisma.usuario.findUnique({
        where: { email: user.email.toLowerCase() },
      });
      if (usuarioPorEmail) {
        usuario = await prisma.usuario.update({
          where: { id: usuarioPorEmail.id },
          data: { authUserId: user.id },
        });
      }
    }
  } catch (authErr: any) {
    if (authErr?.digest?.startsWith('NEXT_REDIRECT') || authErr?.message?.includes('NEXT_REDIRECT')) {
      throw authErr;
    }
    console.error('Error al validar permisos de admin:', authErr);
    redirect('/catalogo');
  }

  if (!usuario || (usuario.rol !== Rol.ADMIN && (usuario.rol as string) !== 'ADMIN')) {
    redirect('/catalogo');
  }

  // 2. Conteo de pedidos, clientes, productos, zonas y distribuidores para métricas y badges
  let totalPedidos = 0;
  let pedidosPendientes = 0;
  let totalClientes = 0;
  let clientesPendientes = 0;
  let totalProductos = 0;
  let productosActivos = 0;
  let totalZonas = 0;
  let totalDistribuidores = 0;
  let distribuidoresActivos = 0;
  let totalPacks = 0;
  let packsActivos = 0;
  let totalReglas = 0;
  let reglasActivas = 0;

  try {
    const res = await Promise.all([
      prisma.pedido.count({
        where: { estado: { not: 'CARRITO' } },
      }),
      prisma.pedido.count({
        where: { estado: EstadoPedido.PEDIDO_RECIBIDO },
      }),
      prisma.cliente.count(),
      prisma.cliente.count({
        where: { estadoCliente: EstadoCliente.PENDIENTE_APROBACION },
      }),
      prisma.producto.count(),
      prisma.producto.count({
        where: { activo: true },
      }),
      prisma.zona.count(),
      prisma.distribuidor.count(),
      prisma.distribuidor.count({
        where: { estado: 'ACTIVO' },
      }),
      prisma.pack.count(),
      prisma.pack.count({
        where: { activo: true },
      }),
      prisma.reglaDeDescuento.count(),
      prisma.reglaDeDescuento.count({
        where: { activa: true },
      }),
    ]);
    [
      totalPedidos, 
      pedidosPendientes, 
      totalClientes, 
      clientesPendientes,
      totalProductos,
      productosActivos,
      totalZonas,
      totalDistribuidores,
      distribuidoresActivos,
      totalPacks,
      packsActivos,
      totalReglas,
      reglasActivas,
    ] = res;
  } catch (metricsErr) {
    console.error('Error al obtener métricas del dashboard:', metricsErr);
  }

  const secciones = [
    {
      titulo: 'Pedidos de Salones',
      descripcion: 'Monitoreo, cambios de estado y gestión de pedidos recibidos por WhatsApp.',
      icono: ShoppingCart,
      href: '/admin/pedidos',
      activo: true,
      badge: pedidosPendientes > 0 ? `${pedidosPendientes} nuevos` : `${totalPedidos} total`,
      badgeColor: pedidosPendientes > 0 ? 'bg-amber-500 text-neutral-950' : 'bg-neutral-800 text-neutral-300',
    },
    {
      titulo: 'Clientes y Salones',
      descripcion: 'Aprobación de cuentas profesionales, asignación de zonas y datos de contacto.',
      icono: Users,
      href: '/admin/clientes',
      activo: true,
      badge: clientesPendientes > 0 ? `${clientesPendientes} pendientes` : `${totalClientes} total`,
      badgeColor: clientesPendientes > 0 ? 'bg-amber-500 text-neutral-950 font-bold' : 'bg-neutral-800 text-neutral-300',
    },
    {
      titulo: 'Catálogo de Productos',
      descripcion: 'Gestión de precios salón profesional, stock, destacados, fotos y categorización.',
      icono: Package,
      href: '/admin/productos',
      activo: true,
      badge: `${productosActivos} activos / ${totalProductos} total`,
      badgeColor: 'bg-neutral-800 text-neutral-300',
    },
    {
      titulo: 'Zonas Geográficas',
      descripcion: 'Definición de regiones con o sin cobertura de distribuidores.',
      icono: MapPin,
      href: '/admin/zonas',
      activo: true,
      badge: `${totalZonas} registradas`,
      badgeColor: 'bg-neutral-800 text-neutral-300',
    },
    {
      titulo: 'Distribuidores Oficiales',
      descripcion: 'Gestión de representantes oficiales y distribución mayorista.',
      icono: Truck,
      href: '/admin/distribuidores',
      activo: true,
      badge: `${distribuidoresActivos} activos / ${totalDistribuidores} total`,
      badgeColor: 'bg-neutral-800 text-neutral-300',
    },
    {
      titulo: 'Packs y Promociones',
      descripcion: 'Configuración de combos para salones y lanzamientos.',
      icono: Boxes,
      href: '/admin/packs',
      activo: true,
      badge: `${packsActivos} activos / ${totalPacks} total`,
      badgeColor: 'bg-neutral-800 text-neutral-300',
    },
    {
      titulo: 'Reglas de Descuento',
      descripcion: 'Configuración de porcentajes de primer pedido y reposición por días.',
      icono: Percent,
      href: '/admin/reglas-descuento',
      activo: true,
      badge: `${reglasActivas} activas / ${totalReglas} total`,
      badgeColor: 'bg-neutral-800 text-neutral-300',
    },
  ];

  return (
    <div id="admin-dashboard-root" className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col justify-between p-4 md:p-8">
      <div className="max-w-7xl mx-auto w-full space-y-8">
        <AdminHeader emailAdmin={user.email} />

        <main className="space-y-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-gold-700 block mb-1">
              Panel Administrativo
            </span>
            <h1 className="text-2xl md:text-3xl font-black text-neutral-900 tracking-tight">
              Gestión Integral Steffen Profesional
            </h1>
            <p className="text-neutral-500 text-sm mt-1 max-w-2xl">
              Seleccioná un módulo para gestionar los pedidos, clientes, catálogo y reglas de negocio del portal B2B.
            </p>
          </div>

          {/* Grid de Secciones */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {secciones.map((sec) => {
              const Icono = sec.icono;

              if (sec.activo) {
                return (
                  <Link
                    key={sec.titulo}
                    href={sec.href}
                    className="group relative flex flex-col justify-between bg-white hover:bg-neutral-50 border border-neutral-200 hover:border-gold-400 rounded-2xl p-6 transition-all duration-200 hover:shadow-lg shadow-sm cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-xl bg-gold-50 border border-gold-300 text-gold-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <Icono className="w-6 h-6" />
                        </div>
                        {sec.badge && (
                          <span className={`px-2.5 py-1 text-xs font-bold rounded-full shadow-sm ${
                            pedidosPendientes > 0 || clientesPendientes > 0 ? 'bg-gold-500 text-white' : 'bg-neutral-100 text-neutral-700'
                          }`}>
                            {sec.badge}
                          </span>
                        )}
                      </div>

                      <h2 className="text-lg font-bold text-neutral-900 group-hover:text-gold-700 transition-colors">
                        {sec.titulo}
                      </h2>
                      <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                        {sec.descripcion}
                      </p>
                    </div>

                    <div className="pt-4 mt-4 border-t border-neutral-100 flex items-center justify-between text-xs font-bold text-gold-700">
                      <span>Ingresar al módulo</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                );
              }

              return (
                <div
                  key={sec.titulo}
                  className="relative flex flex-col justify-between bg-neutral-100/70 border border-neutral-200 rounded-2xl p-6 opacity-60 cursor-not-allowed select-none"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-neutral-200 border border-neutral-300 text-neutral-400 flex items-center justify-center">
                        <Icono className="w-6 h-6" />
                      </div>
                      <span className="px-2.5 py-1 text-[11px] font-semibold bg-neutral-200 text-neutral-500 rounded-full border border-neutral-300">
                        Próximamente
                      </span>
                    </div>

                    <h2 className="text-lg font-bold text-neutral-500">
                      {sec.titulo}
                    </h2>
                    <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                      {sec.descripcion}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-neutral-200 flex items-center justify-between text-xs font-medium text-neutral-400">
                    <span>Módulo en construcción</span>
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </div>

      <footer className="max-w-7xl mx-auto w-full py-6 text-center text-xs text-neutral-500 border-t border-neutral-200 mt-12">
        © {new Date().getFullYear()} Steffen Cosmética Capilar • Panel de Control Administrativo
      </footer>
    </div>
  );
}
