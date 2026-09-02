import Link from 'next/link';
import Image from 'next/image';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generarUrlWhatsapp } from '@/lib/whatsapp';
import { SiteHeader } from '@/components/SiteHeader';
import { 
  CheckCircle2, 
  MessageSquare, 
  ArrowLeft, 
  LogOut, 
  Store, 
  Package, 
  Clock, 
  Percent,
  ExternalLink,
  AlertCircle
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface PedidoEnviadoPageProps {
  params: Promise<{ id: string }>;
}

export default async function PedidoEnviadoPage({ params }: PedidoEnviadoPageProps) {
  const { id: pedidoId } = await params;

  // 1. Obtener usuario autenticado en el servidor
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const usuario = await prisma.usuario.findUnique({
    where: { authUserId: user.id },
    include: { cliente: true },
  });

  if (!usuario) {
    redirect('/login');
  }

  // 2. Buscar el pedido por ID incluyendo sus ítems y datos del cliente/producto
  const pedido = await prisma.pedido.findUnique({
    where: { id: pedidoId },
    include: {
      cliente: true,
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

  // 3. Regla de acceso: Si es admin o es el propio cliente dueño del pedido
  const esAdmin = usuario.rol === 'ADMIN';
  const esPropietario = usuario.cliente && pedido.clienteId === usuario.cliente.id;

  if (!esAdmin && !esPropietario) {
    notFound();
  }

  const cliente = usuario.cliente || pedido.cliente;

  // 4. Formateadores
  const formatoMoneda = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  });

  const formatoFecha = new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  // 5. Reconstruir URL de WhatsApp con el mensaje guardado en la base de datos
  const whatsappUrl = generarUrlWhatsapp(pedido.mensajeWhatsappGenerado || '');

  const subtotalPssNum = Number(pedido.subtotalPss);
  const descuentoAplicadoNum = Number(pedido.descuentoAplicado);
  const porcentajeDescuentoNum = Number(pedido.porcentajeDescuento);
  const totalNum = Number(pedido.total);

  return (
    <div id="pedido-enviado-root" className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col justify-between p-4 md:p-8">
      {/* Header */}
      <SiteHeader
        salonNombre={cliente.salon}
        usuarioId={usuario.id}
        sesion={true}
        paginaActual="otro"
        mostrarInicio={true}
        mostrarCatalogo={true}
        mostrarCarrito={false}
      />

      {/* Main Container */}
      <main className="max-w-4xl mx-auto w-full py-8 space-y-6">
        {/* Banner de Éxito */}
        <div className="bg-white border border-neutral-200 rounded-3xl p-6 md:p-8 text-center space-y-4 shadow-sm">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-sm">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-1">
            <span className="inline-block px-3 py-1 text-xs font-bold uppercase tracking-widest bg-gold-50 text-gold-800 border border-gold-300 rounded-full mb-1">
              Pedido Guardado en Sistema
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold text-neutral-900 tracking-tight">
              ¡Pedido #{pedido.numeroPedido} Registrado con Éxito!
            </h1>
            <p className="text-neutral-500 text-sm max-w-lg mx-auto leading-relaxed">
              Tu pedido ha sido guardado de forma permanente en la base de datos de Steffen. Para finalizar la coordinación de envío y pago, completá el envío del mensaje por WhatsApp.
            </p>
          </div>

          {/* Botón Principal para Reabrir WhatsApp o Aviso si no está configurado */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                id="btn-reabrir-whatsapp"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 fill-white" />
                <span>Abrir WhatsApp con Steffen</span>
                <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
              </a>
            ) : (
              <div 
                id="aviso-whatsapp-no-disponible"
                className="w-full max-w-lg p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm flex items-center gap-3 text-left"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-600" />
                <p>
                  No se pudo generar el enlace de WhatsApp, contactanos directamente citando tu número de pedido <strong className="font-bold text-neutral-900">#{pedido.numeroPedido}</strong>.
                </p>
              </div>
            )}

            <Link
              href="/catalogo"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-semibold text-sm transition-colors cursor-pointer border border-neutral-300"
            >
              <span>Ir al Catálogo</span>
            </Link>
          </div>
        </div>

        {/* Detalle y Comprobante del Pedido */}
        <div className="bg-white border border-neutral-200 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
          {/* Metadatos */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-neutral-200">
            <div>
              <span className="text-xs text-neutral-500 font-medium">Fecha y hora del pedido:</span>
              <p className="text-sm font-bold text-neutral-900 flex items-center gap-1.5 mt-0.5">
                <Clock className="w-4 h-4 text-gold-600" />
                {formatoFecha.format(new Date(pedido.fecha))}
              </p>
            </div>

            <div>
              <span className="text-xs text-neutral-500 font-medium">Estado del pedido:</span>
              <div className="mt-0.5">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gold-50 text-gold-800 border border-gold-300">
                  {pedido.estado.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>

          {/* Tabla de Productos Guardados */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-2">
              <Package className="w-4 h-4 text-gold-600" />
              Productos Registrados ({pedido.items.reduce((acc, curr) => acc + curr.cantidad, 0)} unidades)
            </h2>

            <div className="space-y-2.5">
              {pedido.items.map((item) => {
                const esPack = !!item.packId || !!item.pack;
                const nombreItem = item.producto?.nombre || item.pack?.nombre || 'Ítem Steffen';
                const categoriaItem = esPack ? 'Pack Promocional' : item.producto?.categoria || 'Producto';
                const presentacionItem = esPack ? 'Combo Profesional' : item.producto?.presentacion || '';

                return (
                  <div
                    key={item.id}
                    className="bg-neutral-50 border border-neutral-200 rounded-2xl p-4 flex items-center justify-between gap-4"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        {esPack && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-wider">
                            Pack
                          </span>
                        )}
                        <span className="text-[11px] font-bold text-gold-700 uppercase tracking-wider">
                          {categoriaItem}
                        </span>
                      </div>
                      <h3 className="font-bold text-neutral-900 text-sm">
                        {nombreItem}
                      </h3>
                      <p className="text-xs text-neutral-500">
                        {presentacionItem ? `${presentacionItem} • ` : ''}{item.cantidad} u. × {formatoMoneda.format(Number(item.precioUnitarioPss))}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="block text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">Subtotal</span>
                      <span className="text-sm font-bold text-neutral-900">
                        {formatoMoneda.format(Number(item.subtotal))}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Liquidación de Totales Oficial */}
          <div className="pt-4 border-t border-neutral-200 space-y-3 max-w-sm ml-auto">
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-500">Subtotal Salón Profesional:</span>
              <span className="font-bold text-neutral-800">{formatoMoneda.format(subtotalPssNum)}</span>
            </div>

            {descuentoAplicadoNum > 0 && (
              <div className="flex items-center justify-between text-sm text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200">
                <span className="flex items-center gap-1 text-xs">
                  <Percent className="w-3.5 h-3.5" />
                  Descuento ({porcentajeDescuentoNum}% OFF):
                </span>
                <span>-{formatoMoneda.format(descuentoAplicadoNum)}</span>
              </div>
            )}

            <div className="pt-3 border-t border-neutral-200 flex items-center justify-between">
              <span className="text-base font-bold text-neutral-900">Total a transferir:</span>
              <span className="text-2xl font-black text-gold-700 tracking-tight">
                {formatoMoneda.format(totalNum)}
              </span>
            </div>

            {/* Regla 3 */}
            <p className="text-[11px] text-neutral-500 text-right italic">
              El costo de envío será confirmado posteriormente por WhatsApp.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto w-full py-4 text-center text-xs text-neutral-500 border-t border-neutral-200">
        © {new Date().getFullYear()} Steffen Cosmética Capilar • Portal Profesional
      </footer>
    </div>
  );
}
