import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { obtenerSesionCliente } from '@/lib/services/session';
import { obtenerEstadoNivelCliente } from '@/lib/services/nivelCliente';
import { logoutAction } from '@/app/actions/logout';
import { NivelClienteCard } from '@/components/NivelClienteCard';
import { SiteHeader } from '@/components/SiteHeader';
import { 
  User, 
  Store, 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ShoppingBag, 
  ArrowLeft, 
  LogOut,
  PackageCheck,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  Truck,
  Building2,
  MessageCircle,
  ExternalLink
} from 'lucide-react';
import { EstadoCliente, EstadoPedido } from '@prisma/client';
import { normalizarNumeroWhatsapp } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

function formatoMoneda(valor: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(valor);
}

function formatearFecha(fecha: Date): string {
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(fecha);
}

function getBadgeEstadoPedido(estado: EstadoPedido) {
  switch (estado) {
    case EstadoPedido.PEDIDO_RECIBIDO:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
          <Clock className="w-3 h-3 text-amber-600" />
          Pedido Recibido
        </span>
      );
    case EstadoPedido.CONTACTADO:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-200">
          <Clock className="w-3 h-3 text-sky-600" />
          Contactado
        </span>
      );
    case EstadoPedido.PAGO_PENDIENTE:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
          <Clock className="w-3 h-3 text-amber-600" />
          Pago Pendiente
        </span>
      );
    case EstadoPedido.PAGADO:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          Pagado
        </span>
      );
    case EstadoPedido.PREPARANDO:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
          <PackageCheck className="w-3 h-3 text-blue-600" />
          En Preparación
        </span>
      );
    case EstadoPedido.DESPACHADO:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200">
          <PackageCheck className="w-3 h-3 text-indigo-600" />
          Despachado
        </span>
      );
    case EstadoPedido.COMPLETADO:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          Completado
        </span>
      );
    case EstadoPedido.CANCELADO:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-800 border border-red-200">
          <AlertCircle className="w-3 h-3 text-red-600" />
          Cancelado
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-700 border border-neutral-200">
          {estado}
        </span>
      );
  }
}

export default async function PerfilPage() {
  const sesion = await obtenerSesionCliente();

  if (!sesion || !sesion.usuario) {
    redirect('/login?redirect=/perfil');
  }

  if (sesion.estadoCliente === EstadoCliente.BLOQUEADO) {
    redirect('/cuenta-bloqueada');
  }

  const cliente = sesion.cliente;
  const usuario = sesion.usuario;

  // Consultar estado de nivel y beneficios de reposición
  const estadoNivel = await obtenerEstadoNivelCliente(cliente);

  // Consultar pedidos históricos del cliente
  const pedidos = cliente
    ? await prisma.pedido.findMany({
        where: { clienteId: cliente.id },
        include: {
          items: {
            include: {
              producto: true,
              pack: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 15,
      })
    : [];

  return (
    <div id="perfil-root" className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col justify-between p-4 md:p-8">
      {/* Header */}
      <SiteHeader
        salonNombre={cliente?.salon}
        usuarioId={usuario?.id}
        sesion={true}
        esAdmin={sesion.rol === 'ADMIN'}
        paginaActual="perfil"
        mostrarInicio={true}
        mostrarCatalogo={true}
        mostrarCarrito={true}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto w-full py-8 space-y-8">
        {/* Banner de Estado de la Cuenta */}
        {cliente?.estadoCliente === EstadoCliente.PENDIENTE_APROBACION && (
          <div
            id="banner-estado-pendiente"
            className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row items-start gap-4 shadow-sm"
          >
            <ShieldAlert className="w-6 h-6 shrink-0 text-amber-600 mt-0.5" />
            <div className="space-y-1">
              <h2 className="text-base font-bold text-amber-950">
                Tu cuenta profesional está pendiente de aprobación
              </h2>
              <p className="text-xs md:text-sm text-amber-800 leading-relaxed">
                El equipo de Steffen está revisando los datos de tu salón. Mientras tanto, podés consultar el catálogo completo y realizar pedidos con precios públicos de referencia. Una vez que tu cuenta sea aprobada por administración, accederás automáticamente a los precios salón profesional oficiales directos de fábrica y a la escala de descuentos por volumen.
              </p>
            </div>
          </div>
        )}

        {cliente?.estadoCliente === EstadoCliente.INACTIVO && (
          <div
            id="banner-estado-inactivo"
            className="p-5 rounded-2xl bg-neutral-100 border border-neutral-300 text-neutral-800 flex flex-col sm:flex-row items-start gap-4 shadow-sm"
          >
            <AlertCircle className="w-6 h-6 shrink-0 text-neutral-600 mt-0.5" />
            <div className="space-y-1">
              <h2 className="text-base font-bold text-neutral-950">
                Cuenta profesional inactiva
              </h2>
              <p className="text-xs md:text-sm text-neutral-700 leading-relaxed">
                Tu cuenta se encuentra actualmente en estado inactivo. Comunicate con tu distribuidor Steffen asignado o por WhatsApp oficial para reactivar tus beneficios profesionales.
              </p>
            </div>
          </div>
        )}

        {cliente?.estadoCliente === EstadoCliente.ACTIVO && (
          <div
            id="banner-estado-activo"
            className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex flex-col sm:flex-row items-start gap-4 shadow-sm"
          >
            <ShieldCheck className="w-6 h-6 shrink-0 text-emerald-600 mt-0.5" />
            <div className="space-y-1">
              <h2 className="text-base font-bold text-emerald-950">
                Cuenta profesional activa y verificada
              </h2>
              <p className="text-xs md:text-sm text-emerald-800 leading-relaxed">
                Tenés acceso total a los precios salón profesional oficiales directos de fábrica y a la escala de descuentos automáticos para compras mayoristas y de salón.
              </p>
            </div>
          </div>
        )}

        {/* Banner/Tarjeta de Beneficios / Reposición */}
        <NivelClienteCard
          estadoNivel={estadoNivel}
          estadoCliente={cliente?.estadoCliente}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Columna Izquierda: Información del Salón y Distribuidor Asignado */}
          <div className="space-y-6">
            {/* Tarjeta de Información del Salón / Profesional */}
            <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-neutral-100">
                <div className="w-12 h-12 rounded-xl bg-gold-50 border border-gold-200 flex items-center justify-center text-gold-700 font-bold text-lg">
                  {cliente?.nombre?.[0] || 'P'}
                </div>
                <div>
                  <h2 className="text-base font-bold text-neutral-900 leading-tight">
                    {cliente?.nombre} {cliente?.apellido}
                  </h2>
                  <span className="text-xs text-neutral-500">{usuario.email}</span>
                </div>
              </div>

              <div className="space-y-4 text-xs md:text-sm">
                <div className="flex items-start gap-3">
                  <Store className="w-4 h-4 text-gold-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[11px] text-neutral-400 uppercase tracking-wider font-semibold block">Salón</span>
                    <span className="font-semibold text-neutral-800">{cliente?.salon || 'No especificado'}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-gold-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[11px] text-neutral-400 uppercase tracking-wider font-semibold block">WhatsApp / Teléfono</span>
                    <span className="font-semibold text-neutral-800">{cliente?.whatsapp || 'No especificado'}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-gold-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[11px] text-neutral-400 uppercase tracking-wider font-semibold block">Ubicación</span>
                    <span className="font-semibold text-neutral-800">
                      {cliente?.localidad}, {cliente?.provincia}
                    </span>
                    {cliente?.zona && (
                      <span className="text-xs text-neutral-500 block mt-0.5">
                        Zona: {cliente.zona.localidad} ({cliente.zona.estado.replace(/_/g, ' ')})
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-gold-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[11px] text-neutral-400 uppercase tracking-wider font-semibold block">Tipo de Cuenta</span>
                    <span className="font-semibold text-neutral-800 capitalize">
                      {usuario.rol.toLowerCase()} • {cliente?.estadoCliente || 'PENDIENTE_APROBACION'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-neutral-100">
                <Link
                  href="/catalogo"
                  className="w-full py-2.5 px-4 rounded-xl bg-gold-500 hover:bg-gold-400 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Explorar Catálogo</span>
                </Link>
              </div>
            </div>

            {/* Tarjeta de Distribuidor Oficial Asignado (si existe) */}
            {cliente?.zona?.distribuidor && (() => {
              const dist = cliente.zona.distribuidor;
              const cleanNumber = normalizarNumeroWhatsapp(dist.whatsapp);
              const mensajeDefault = `Hola ${dist.nombre}, me contacto desde el portal profesional de Steffen por mi salón ${cliente.salon ? `(${cliente.salon})` : ''} en ${cliente.zona.localidad}, ${cliente.zona.provincia}.`;
              const wsUrl = `https://api.whatsapp.com/send?phone=${cleanNumber}&text=${encodeURIComponent(mensajeDefault)}`;

              return (
                <div
                  id="tarjeta-distribuidor-perfil"
                  className="bg-white border border-gold-200/90 rounded-2xl p-6 shadow-sm space-y-4 relative overflow-hidden"
                >
                  <div className="flex items-center gap-3 pb-3 border-b border-neutral-100">
                    <div className="w-10 h-10 rounded-xl bg-gold-50 border border-gold-200 flex items-center justify-center text-gold-700 font-bold shrink-0">
                      <Truck className="w-5 h-5 text-gold-600" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gold-800 bg-gold-100 px-2 py-0.5 rounded-md">
                        Distribuidor Oficial en tu Zona
                      </span>
                      <h3 className="text-sm font-bold text-neutral-900 mt-1 leading-tight">
                        {dist.nombre}
                      </h3>
                    </div>
                  </div>

                  <div className="space-y-3 text-xs md:text-sm">
                    {dist.empresa && (
                      <div className="flex items-start gap-3">
                        <Building2 className="w-4 h-4 text-gold-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[11px] text-neutral-400 uppercase tracking-wider font-semibold block">Empresa / Distribuidora</span>
                          <span className="font-semibold text-neutral-800">{dist.empresa}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-gold-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[11px] text-neutral-400 uppercase tracking-wider font-semibold block">Zona Asignada</span>
                        <span className="font-semibold text-neutral-800">
                          {cliente.zona.localidad}, {cliente.zona.provincia}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs text-neutral-600 leading-relaxed">
                      Podés contactarlo directo para conocer condiciones de entrega y acceder a mejores precios y promociones.
                    </div>
                  </div>

                  {cleanNumber && (
                    <div className="pt-2">
                      <a
                        id="btn-whatsapp-distribuidor-perfil"
                        href={wsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>Contactar por WhatsApp ({dist.whatsapp})</span>
                        <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                      </a>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Historial de Pedidos */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-600 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gold-600" />
                Historial de Pedidos Realizados ({pedidos.length})
              </h2>
            </div>

            {pedidos.length === 0 ? (
              <div className="bg-white border border-neutral-200 rounded-2xl p-10 text-center space-y-3 shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-center text-neutral-400 mx-auto">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-neutral-900">Aún no registrás pedidos</h3>
                <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                  Tus pedidos confirmados por WhatsApp quedarán registrados aquí con su número de orden y detalle de artículos.
                </p>
                <Link
                  href="/catalogo"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-white font-bold text-xs transition-all shadow-sm"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Hacer mi primer pedido</span>
                </Link>
              </div>
            ) : (
              <div className="space-y-4" id="lista-pedidos-perfil">
                {pedidos.map((ped) => (
                  <div
                    key={ped.id}
                    id={`pedido-card-${ped.id}`}
                    className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-4 shadow-sm hover:border-neutral-300 transition-all"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-neutral-100">
                      <div>
                        <span className="text-xs font-bold text-neutral-900">
                          Pedido #{ped.numeroPedido}
                        </span>
                        <span className="text-[11px] text-neutral-400 block mt-0.5">
                          {formatearFecha(ped.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {getBadgeEstadoPedido(ped.estado)}
                      </div>
                    </div>

                    {/* Detalle de ítems */}
                    <div className="space-y-2">
                      {ped.items.map((it) => {
                        const esPack = !!it.packId || !!it.pack;
                        const nombreItem = it.producto?.nombre || it.pack?.nombre || 'Ítem Steffen';
                        const presentacionItem = esPack ? 'Combo Profesional' : it.producto?.presentacion || '';

                        return (
                          <div
                            key={it.id}
                            className="flex items-center justify-between text-xs text-neutral-700 py-1"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-neutral-900 bg-neutral-100 px-1.5 py-0.5 rounded text-[11px]">
                                {it.cantidad}x
                              </span>
                              {esPack && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-wider">
                                  Pack
                                </span>
                              )}
                              <span className="font-medium text-neutral-800">
                                {nombreItem}
                              </span>
                              {presentacionItem && (
                                <span className="text-neutral-400 text-[11px]">
                                  ({presentacionItem})
                                </span>
                              )}
                            </div>
                            <span className="font-semibold text-neutral-900">
                              {formatoMoneda(Number(it.subtotal))}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Resumen de totales */}
                    <div className="pt-3 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="text-neutral-500">
                        {Number(ped.descuentoAplicado) > 0 && (
                          <span className="text-emerald-700 font-semibold mr-3">
                            Descuento: -{formatoMoneda(Number(ped.descuentoAplicado))} ({Number(ped.porcentajeDescuento)}%)
                          </span>
                        )}
                        <span>Subtotal: {formatoMoneda(Number(ped.subtotalPss))}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-neutral-500 font-medium">Total:</span>
                        <span className="text-base font-extrabold text-gold-700">
                          {formatoMoneda(Number(ped.total))}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto w-full py-4 text-center text-xs text-neutral-500 border-t border-neutral-200">
        © {new Date().getFullYear()} Steffen Cosmética Capilar • Portal Profesional
      </footer>
    </div>
  );
}
