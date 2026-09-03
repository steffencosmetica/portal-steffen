import { logoutAction } from '@/app/actions/logout';
import { CarritoClient } from '@/components/carrito/CarritoClient';
import { SiteHeader } from '@/components/SiteHeader';
import { obtenerSesionCliente } from '@/lib/services/session';
import { ShieldAlert } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function CarritoPage() {
  // 1. Obtener sesión del cliente en el servidor
  const sesion = await obtenerSesionCliente();
  const cliente = sesion?.cliente || null;
  const usuarioId = sesion?.usuario?.id || '';
  const salonNombre = cliente?.salon || '';
  const estadoCliente = sesion?.estadoCliente || null;
  const esActivo = estadoCliente === 'ACTIVO';
  const tieneDistribuidor = Boolean(
    cliente?.zona?.distribuidor || cliente?.zona?.distribuidorId || cliente?.zona?.estado === 'CON_DISTRIBUIDOR'
  );
  const esSinDistribuidor = Boolean(sesion && cliente && !tieneDistribuidor);

  return (
    <div id="carrito-root" className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col justify-between p-4 md:p-8">
      {/* Header */}
      <SiteHeader
        salonNombre={salonNombre}
        usuarioId={usuarioId}
        sesion={!!sesion}
        paginaActual="carrito"
        mostrarCarrito={false}
        mostrarCatalogo={true}
        mostrarInicio={true}
        sinDistribuidorAsignado={esSinDistribuidor}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto w-full py-8">
        <div className="mb-6 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 tracking-tight">
              Carrito de Pedido
            </h1>
            {estadoCliente && estadoCliente !== 'ACTIVO' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                Cuenta {estadoCliente === 'PENDIENTE_APROBACION' ? 'Pendiente de Aprobación' : 'Inactiva'}
              </span>
            )}
          </div>
          <p className="text-neutral-500 text-sm">
            {esActivo
              ? 'Revisá los productos y cantidades para tu salón. Los precios son oficiales para profesionales directos de fábrica.'
              : 'Revisá los productos de tu pedido. Recordá que con una cuenta profesional activa accedés a descuentos directos de fábrica.'}
          </p>
        </div>

        <CarritoClient
          salonNombre={salonNombre}
          usuarioId={usuarioId}
          usuarioLogueado={!!sesion}
          estadoCliente={estadoCliente}
          esSinDistribuidor={esSinDistribuidor}
        />
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto w-full py-4 text-center text-xs text-neutral-500 border-t border-neutral-200">
        © {new Date().getFullYear()} Steffen Cosmética Capilar • Portal Profesional
      </footer>
    </div>
  );
}
