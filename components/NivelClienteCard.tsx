import React from 'react';
import Link from 'next/link';
import { EstadoNivelCliente } from '@/lib/services/nivelCliente';
import { EstadoCliente } from '@prisma/client';
import { Percent, Clock, ArrowRight } from 'lucide-react';

export interface NivelClienteCardProps {
  estadoNivel: EstadoNivelCliente | null | undefined;
  estadoCliente?: EstadoCliente | string | null;
  mostrarBotonCatalogo?: boolean;
  className?: string;
}

export function NivelClienteCard({
  estadoNivel,
  estadoCliente,
  mostrarBotonCatalogo = true,
  className = '',
}: NivelClienteCardProps) {
  if (
    !estadoNivel ||
    estadoNivel.motivoNoElegible === 'CON_DISTRIBUIDOR' ||
    estadoNivel.motivoNoElegible === 'SIN_CLIENTE'
  ) {
    return null;
  }

  const esPrimerPedido = estadoNivel.motivoNoElegible === 'PRIMER_PEDIDO';
  const esPendienteAprobacion =
    esPrimerPedido && estadoCliente === 'PENDIENTE_APROBACION';
  const tieneDescuentoActivo =
    estadoNivel.porcentajeActual !== null && estadoNivel.porcentajeActual > 0;
  const es15 = estadoNivel.porcentajeActual === 15;
  const es10 = estadoNivel.porcentajeActual === 10;

  return (
    <div
      id="card-nivel-reposicion"
      className={`rounded-2xl border p-5 md:p-6 transition-all shadow-sm relative overflow-hidden ${
        tieneDescuentoActivo
          ? 'bg-gradient-to-br from-amber-50/90 via-white to-amber-50/40 border-amber-300/80 text-neutral-900'
          : 'bg-white border-neutral-200 text-neutral-900'
      } ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border shadow-xs ${
              tieneDescuentoActivo
                ? 'bg-amber-100 border-amber-300 text-amber-900'
                : 'bg-neutral-100 border-neutral-200 text-neutral-700'
            }`}
          >
            {tieneDescuentoActivo ? (
              <Percent className="w-5 h-5 text-amber-900" />
            ) : (
              <Clock className="w-5 h-5 text-neutral-700" />
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gold-800 bg-gold-100/90 border border-gold-300 px-2.5 py-0.5 rounded-full">
                {esPrimerPedido ? 'Bienvenida Salón' : 'Descuento por Reposición'}
              </span>
              {tieneDescuentoActivo && (
                <span className="text-[11px] font-extrabold tracking-wide text-white bg-neutral-900 px-2 py-0.5 rounded-md">
                  {estadoNivel.porcentajeActual}% OFF
                </span>
              )}
            </div>

            <h3 className="text-base sm:text-lg font-extrabold text-neutral-900 leading-snug">
              {estadoNivel.mensajePrincipal}
            </h3>

            <p className="text-xs sm:text-sm text-neutral-700 font-medium leading-relaxed">
              {estadoNivel.mensajeSecundario}
            </p>

            {esPendienteAprobacion && (
              <p className="text-xs sm:text-sm text-amber-800 font-medium leading-relaxed pt-1">
                Tu cuenta está en revisión para acceder a los precios profesionales, pero ya tenés habilitado tu beneficio de bienvenida del {estadoNivel.porcentajeActual}% OFF en tu primera compra.
              </p>
            )}

            {/* Barra de progreso de días si está en reposición (máximo 45 días) */}
            {estadoNivel.diasTranscurridos !== null && (
              <div className="pt-2 max-w-md">
                <div className="flex items-center justify-between text-[11px] text-neutral-500 font-semibold mb-1">
                  <span>
                    {estadoNivel.diasTranscurridos <= 45 
                      ? `Día ${estadoNivel.diasTranscurridos} de 45` 
                      : `Día ${estadoNivel.diasTranscurridos} (Beneficio finalizado)`}
                  </span>
                  <span>
                    {es15 
                      ? 'Tramo 15% (hasta día 30)' 
                      : es10 
                      ? 'Tramo 10% (días 31 a 45)' 
                      : 'Beneficio expirado'}
                  </span>
                </div>
                <div className="h-2 w-full bg-neutral-200 rounded-full overflow-hidden flex">
                  <div
                    className="bg-amber-500 h-full transition-all"
                    style={{
                      width: `${Math.min(100, (Math.min(estadoNivel.diasTranscurridos, 30) / 45) * 100)}%`,
                    }}
                  />
                  {estadoNivel.diasTranscurridos > 30 && (
                    <div
                      className="bg-amber-400 h-full transition-all"
                      style={{
                        width: `${Math.min(100, ((Math.min(estadoNivel.diasTranscurridos, 45) - 30) / 45) * 100)}%`,
                      }}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {mostrarBotonCatalogo && (
          <div className="shrink-0 pt-2 sm:pt-0">
            <Link
              href="/catalogo"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs sm:text-sm transition-all shadow-sm"
            >
              <span>Hacer Pedido</span>
              <ArrowRight className="w-4 h-4 text-gold-400" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// Alias para compatibilidad con código existente
export const BannerNivelReposicion = NivelClienteCard;
