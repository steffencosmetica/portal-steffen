import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Rol } from '@prisma/client';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { EstadoPedidoSelector } from '@/components/admin/EstadoPedidoSelector';
import { 
  ArrowLeft, 
  Store, 
  MapPin, 
  MessageSquare, 
  Package, 
  Percent, 
  ExternalLink,
  Clock
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface AdminPedidoDetallePageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminPedidoDetallePage({ params }: AdminPedidoDetallePageProps) {
  const { id: pedidoId } = await params;

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

  // 2. Fetch completo del Pedido con sus ítems, productos y datos del cliente
  const pedido = await prisma.pedido.findUnique({
    where: { id: pedidoId },
    include: {
      cliente: {
        include: { zona: true },
      },
      items: {
        include: {
          producto: true,
          pack: true,
        },
      },
    },
  });

  if (!pedido) {
    notFound();
  }

  const formatoMoneda = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  });

  const formatoFecha = new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'full',
    timeStyle: 'short',
  });

  // Limpiar número de whatsapp del cliente para link directo
  const whatsappClienteLimpio = pedido.cliente.whatsapp.replace(/\D/g, '');
  const urlWhatsappCliente = whatsappClienteLimpio.length >= 8
    ? `https://wa.me/${whatsappClienteLimpio}`
    : null;

  // Datos históricos persistidos (sin recalcular nada)
  const subtotalPssNum = Number(pedido.subtotalPss);
  const descuentoAplicadoNum = Number(pedido.descuentoAplicado);
  const porcentajeDescuentoNum = Number(pedido.porcentajeDescuento);
  const totalNum = Number(pedido.total);

  return (
    <div id="admin-pedido-detalle-root" className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col justify-between p-4 md:p-8">
      <div className="max-w-7xl mx-auto w-full space-y-8">
        <AdminHeader titulo={`Pedido #${pedido.numeroPedido}`} emailAdmin={user.email} />

        <main className="space-y-6">
          {/* Navegación y Título */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1">
                <Link href="/admin/pedidos" className="hover:text-gold-700 transition-colors flex items-center gap-1">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Volver a Pedidos</span>
                </Link>
                <span>/</span>
                <span className="text-neutral-700">Detalle</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-neutral-900 tracking-tight">
                Pedido #{pedido.numeroPedido}
              </h1>
              <p className="text-xs text-neutral-500 mt-0.5 flex items-center gap-1.5 font-medium">
                <Clock className="w-3.5 h-3.5 text-gold-600" />
                {formatoFecha.format(new Date(pedido.fecha))}
              </p>
            </div>

            {/* Acceso directo a WhatsApp del Salón */}
            {urlWhatsappCliente && (
              <a
                href={urlWhatsappCliente}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs md:text-sm font-bold transition-all shadow-sm"
              >
                <MessageSquare className="w-4 h-4 fill-emerald-600 text-emerald-600" />
                <span>Escribir a {pedido.cliente.salon} (WhatsApp)</span>
                <ExternalLink className="w-3.5 h-3.5 text-emerald-700" />
              </a>
            )}
          </div>

          {/* Grid Principal: Info del Pedido y Selector de Estado */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Columna Izquierda: Datos del Salón y Detalle de Ítems */}
            <div className="lg:col-span-2 space-y-6">
              {/* Tarjeta de Datos del Salón / Cliente */}
              <div className="bg-white border border-neutral-200 rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-2 border-b border-neutral-100 pb-3">
                  <Store className="w-4 h-4 text-gold-600" />
                  Datos del Salón y Profesional
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs md:text-sm">
                  <div>
                    <span className="text-neutral-500 block text-xs">Nombre del Salón:</span>
                    <strong className="text-neutral-900 text-base">{pedido.cliente.salon}</strong>
                  </div>

                  <div>
                    <span className="text-neutral-500 block text-xs">Responsable:</span>
                    <span className="text-neutral-800 font-semibold">{pedido.cliente.nombre} {pedido.cliente.apellido}</span>
                  </div>

                  <div>
                    <span className="text-neutral-500 block text-xs">Ubicación:</span>
                    <span className="text-neutral-700">{pedido.cliente.localidad}, {pedido.cliente.provincia}</span>
                  </div>

                  <div>
                    <span className="text-neutral-500 block text-xs">WhatsApp de Contacto:</span>
                    <span className="text-gold-700 font-mono font-bold">{pedido.cliente.whatsapp}</span>
                  </div>

                  {pedido.cliente.zona && (
                    <div className="sm:col-span-2 pt-2 border-t border-neutral-100">
                      <span className="text-neutral-500 block text-xs">Zona Geográfica Asignada:</span>
                      <span className="text-neutral-700">
                        {pedido.cliente.zona.provincia} - {pedido.cliente.zona.localidad} ({pedido.cliente.zona.estado.replace('_', ' ')})
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Detalle de Productos Registrados (Snapshot del Pedido) */}
              <div className="bg-white border border-neutral-200 rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-2 border-b border-neutral-100 pb-3">
                  <Package className="w-4 h-4 text-gold-600" />
                  Ítems del Pedido ({pedido.items.reduce((acc, curr) => acc + curr.cantidad, 0)} unidades)
                </h2>

                <div className="space-y-3">
                  {pedido.items.map((item) => {
                    const esPack = !!item.packId || !!item.pack;
                    const nombreItem = item.producto?.nombre || item.pack?.nombre || 'Ítem Steffen';
                    const categoriaItem = esPack ? 'Pack Promocional' : item.producto?.categoria || 'Cosmética';
                    const presentacionItem = esPack ? 'Combo Profesional' : item.producto?.presentacion || '-';

                    return (
                      <div
                        key={item.id}
                        className="bg-neutral-50 border border-neutral-200 rounded-xl p-3.5 flex items-center justify-between gap-4"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            {esPack && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-wider">
                                Pack
                              </span>
                            )}
                            <span className="text-[10px] font-semibold text-gold-700 uppercase tracking-wider">
                              {categoriaItem}
                            </span>
                          </div>
                          <h3 className="font-semibold text-neutral-900 text-sm leading-snug">
                            {nombreItem}
                          </h3>
                          <p className="text-xs text-neutral-500">
                            Presentación: <span className="text-neutral-700">{presentacionItem}</span> • {item.cantidad} u. × {formatoMoneda.format(Number(item.precioUnitarioPss))}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="block text-[10px] text-neutral-400 uppercase tracking-wider">Subtotal</span>
                          <span className="text-sm font-bold text-neutral-900">
                            {formatoMoneda.format(Number(item.subtotal))}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Texto Generado de WhatsApp (Para consulta y respaldo) */}
              {pedido.mensajeWhatsappGenerado && (
                <div className="bg-white border border-neutral-200 rounded-2xl p-5 md:p-6 shadow-sm space-y-3">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-emerald-600" />
                    Mensaje Formateado para WhatsApp (Copia de Respaldo)
                  </h2>
                  <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 text-xs font-mono text-neutral-700 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                    {pedido.mensajeWhatsappGenerado}
                  </div>
                </div>
              )}
            </div>

            {/* Columna Derecha: Selector de Estado y Resumen Económico */}
            <div className="space-y-6">
              {/* Selector Interactivo de Estado del Pedido */}
              <EstadoPedidoSelector pedidoId={pedido.id} estadoActual={pedido.estado} />

              {/* Resumen Económico Histórico */}
              <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-500 border-b border-neutral-100 pb-3">
                  Liquidación Económica
                </h2>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500">Subtotal Salón Profesional:</span>
                    <span className="font-bold text-neutral-800">{formatoMoneda.format(subtotalPssNum)}</span>
                  </div>

                  {descuentoAplicadoNum > 0 && (
                    <div className="flex items-center justify-between text-emerald-800 font-semibold p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
                      <span className="flex items-center gap-1">
                        <Percent className="w-3.5 h-3.5 text-emerald-600" />
                        Descuento ({porcentajeDescuentoNum}% OFF):
                      </span>
                      <span>-{formatoMoneda.format(descuentoAplicadoNum)}</span>
                    </div>
                  )}

                  <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
                    <span className="text-sm font-bold text-neutral-900 uppercase tracking-wider">Total a Transferir:</span>
                    <span className="text-2xl font-black text-gold-700 tracking-tight">
                      {formatoMoneda.format(totalNum)}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-neutral-100 text-[11px] text-neutral-400 italic">
                  * Precios y descuentos registrados al momento de confirmación del pedido.
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <footer className="max-w-7xl mx-auto w-full py-6 text-center text-xs text-neutral-500 border-t border-neutral-200 mt-12">
        © {new Date().getFullYear()} Steffen Cosmética Capilar • Panel de Control Administrativo
      </footer>
    </div>
  );
}
