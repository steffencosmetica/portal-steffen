'use client';

import React, { useState } from 'react';
import { PotencialReventaResultado } from '@/lib/services/reventa';
import {
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Info,
  DollarSign,
  Receipt,
  PiggyBank,
  Check,
} from 'lucide-react';

interface TarjetaPotencialReventaProps {
  potencial: PotencialReventaResultado;
  mostrarDetalleArticulos?: boolean;
}

export function TarjetaPotencialReventa({
  potencial,
  mostrarDetalleArticulos = true,
}: TarjetaPotencialReventaProps) {
  const [desgloseAbierto, setDesgloseAbierto] = useState(false);

  const formatoMoneda = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const {
    facturacionPotencial,
    inversion,
    gananciaPotencial,
    porcentajeGanancia,
    items,
  } = potencial;

  return (
    <div
      id="tarjeta-potencial-reventa"
      className="rounded-2xl border border-emerald-200 bg-linear-to-br from-emerald-50/60 via-white to-amber-50/30 p-5 md:p-6 shadow-xs space-y-4"
    >
      {/* Encabezado de la Tarjeta */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 block">
              Proyección Comercial para tu Salón
            </span>
            <h3 className="text-base font-extrabold text-neutral-900 leading-tight">
              POTENCIAL DE REVENTA SUGERIDO
            </h3>
          </div>
        </div>

        {porcentajeGanancia > 0 && (
          <span className="px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-black shadow-xs tracking-wide">
            +{porcentajeGanancia}% de ganancia
          </span>
        )}
      </div>

      {/* Las 3 Métricas Principales requeridas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* 1. Facturación Potencial */}
        <div className="bg-white/95 rounded-xl border border-neutral-200/80 p-3.5 flex flex-col justify-between shadow-2xs">
          <div>
            <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wide flex items-center gap-1">
              <Receipt className="w-3.5 h-3.5 text-neutral-400" />
              <span>Facturación potencial</span>
            </span>
            <span className="text-[11px] text-neutral-500 block">
              con precio sugerido
            </span>
          </div>
          <div className="mt-2">
            <span className="text-lg md:text-xl font-black text-neutral-900 tracking-tight block">
              {formatoMoneda.format(facturacionPotencial)}
            </span>
            <span className="text-[10px] text-neutral-500">
              Sugerido venta en salón
            </span>
          </div>
        </div>

        {/* 2. Inversión en el Pack */}
        <div className="bg-white/95 rounded-xl border border-neutral-200/80 p-3.5 flex flex-col justify-between shadow-2xs">
          <div>
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wide flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-amber-600" />
              <span>Inversión en el pack</span>
            </span>
            <span className="text-[11px] text-neutral-500 block">
              costo salón bonificado
            </span>
          </div>
          <div className="mt-2">
            <span className="text-lg md:text-xl font-black text-neutral-900 tracking-tight block">
              {formatoMoneda.format(inversion)}
            </span>
            <span className="text-[10px] text-amber-700 font-semibold">
              Tarifa profesional con descuento
            </span>
          </div>
        </div>

        {/* 3. Ganancia Potencial Estimada */}
        <div className="bg-emerald-500/10 rounded-xl border border-emerald-300 p-3.5 flex flex-col justify-between shadow-2xs">
          <div>
            <span className="text-[11px] font-black text-emerald-900 uppercase tracking-wide flex items-center gap-1">
              <PiggyBank className="w-3.5 h-3.5 text-emerald-700" />
              <span>Ganancia potencial</span>
            </span>
            <span className="text-[11px] text-emerald-800 block font-medium">
              estimada para tu mostrador
            </span>
          </div>
          <div className="mt-2">
            <span className="text-xl md:text-2xl font-black text-emerald-800 tracking-tight block">
              {formatoMoneda.format(gananciaPotencial)}
            </span>
            <span className="text-[10px] text-emerald-700 font-bold">
              Retorno directo sobre inversión
            </span>
          </div>
        </div>
      </div>

      {/* Toggle para Desglose Producto por Producto */}
      {mostrarDetalleArticulos && items && items.length > 0 && (
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setDesgloseAbierto((prev) => !prev)}
            className="w-full flex items-center justify-between text-xs font-bold text-emerald-900 hover:text-emerald-700 p-2.5 rounded-xl bg-white/70 hover:bg-white border border-emerald-200/80 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-emerald-700" />
              <span>
                {desgloseAbierto
                  ? 'Ocultar desglose de precios sugeridos'
                  : `Ver cálculo de reventa por producto (${items.length} artículos)`}
              </span>
            </span>
            {desgloseAbierto ? (
              <ChevronUp className="w-4 h-4 text-emerald-700" />
            ) : (
              <ChevronDown className="w-4 h-4 text-emerald-700" />
            )}
          </button>

          {desgloseAbierto && (
            <div className="mt-2 bg-white rounded-xl border border-emerald-200 p-3 divide-y divide-neutral-100 text-xs shadow-2xs animate-in fade-in duration-200">
              <div className="pb-2 text-[11px] text-neutral-500 font-semibold grid grid-cols-12 gap-2">
                <span className="col-span-6">Producto y presentación</span>
                <span className="col-span-3 text-right">Público sugerido</span>
                <span className="col-span-3 text-right">Subtotal venta</span>
              </div>
              {items.map((it, idx) => (
                <div
                  key={`${it.productoId}-${idx}`}
                  className="py-2 grid grid-cols-12 gap-2 items-center text-[11px]"
                >
                  <div className="col-span-6">
                    <span className="font-bold text-neutral-800 block leading-tight">
                      {it.nombre}
                    </span>
                    <span className="text-neutral-500 text-[10px]">
                      {it.presentacion ? `${it.presentacion} • ` : ''}
                      <strong className="text-emerald-800">x{it.cantidad} unid.</strong>
                      {it.esExhibidora && it.unidadesPorCaja ? (
                        <span className="text-emerald-700 font-medium"> ({it.unidadesPorCaja * it.cantidad} u. reventa)</span>
                      ) : null}
                    </span>
                  </div>
                  <div className="col-span-3 text-right font-medium text-neutral-700">
                    <div>{formatoMoneda.format(it.precioEcommerceUnitario)}</div>
                    {it.esExhibidora && (
                      <span className="text-[9px] text-neutral-400 block font-normal leading-tight">
                        c/u
                      </span>
                    )}
                  </div>
                  <div className="col-span-3 text-right font-bold text-neutral-900">
                    {formatoMoneda.format(it.subtotalEcommerce)}
                  </div>
                </div>
              ))}
              <div className="pt-2 flex items-center justify-between text-xs font-black text-neutral-900 border-t border-neutral-200">
                <span>Total Facturación Sugerida:</span>
                <span className="text-emerald-800">
                  {formatoMoneda.format(facturacionPotencial)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Nota aclaratoria al pie */}
      <p className="text-[10px] text-neutral-500 leading-normal border-t border-emerald-100/80 pt-2 flex items-start gap-1.5">
        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
        <span>
          Cálculo automatizado tomando como referencia el precio final bonificado del pack como inversión para tu salón, y el precio sugerido de venta al público en salones.
        </span>
      </p>
    </div>
  );
}
