'use client';

import React, { useState } from 'react';
import { Truck, MessageCircle, X, ExternalLink } from 'lucide-react';

interface DistribuidorBannerProps {
  zona: {
    localidad: string;
    provincia: string;
  };
  distribuidor: {
    nombre: string;
    empresa: string | null;
    whatsapp: string;
  };
}

export function DistribuidorBanner({ zona, distribuidor }: DistribuidorBannerProps) {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  const cleanNumber = distribuidor.whatsapp.replace(/\D/g, '');
  const numberConPrefijo = cleanNumber.startsWith('549') 
    ? cleanNumber 
    : cleanNumber.startsWith('54') 
      ? `549${cleanNumber.slice(2)}` 
      : cleanNumber.length === 10 
        ? `549${cleanNumber}` 
        : cleanNumber;
  const mensajeDefault = `Hola ${distribuidor.nombre}, me contacto desde el portal profesional de Steffen por mi salón en ${zona.localidad}, ${zona.provincia}.`;
  const wsUrl = `https://api.whatsapp.com/send?phone=${numberConPrefijo}&text=${encodeURIComponent(mensajeDefault)}`;

  return (
    <div
      id="banner-distribuidor-oficial"
      className="max-w-7xl mx-auto w-full mb-6 bg-gradient-to-r from-amber-50 via-gold-50/70 to-amber-50 border border-gold-200/80 rounded-2xl p-4 sm:p-5 shadow-xs transition-all relative animate-in fade-in duration-200"
    >
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pr-7 sm:pr-8">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gold-500/10 border border-gold-300/50 flex items-center justify-center text-gold-700 shrink-0 mt-0.5">
            <Truck className="w-5 h-5 text-gold-600" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gold-800 bg-gold-200/60 px-2 py-0.5 rounded-md">
                Distribución Oficial
              </span>
            </div>
            <p className="text-xs sm:text-sm text-neutral-800 leading-relaxed font-normal">
              En tu zona (<strong className="font-semibold text-neutral-900">{zona.localidad}, {zona.provincia}</strong>) contás con un distribuidor oficial Steffen:{' '}
              <strong className="font-bold text-neutral-900">
                {distribuidor.nombre}
                {distribuidor.empresa ? ` (${distribuidor.empresa})` : ''}
              </strong>
              . Podés contactarlo directo para conocer condiciones de entrega y acceder a mejores precios y promociones.
            </p>
          </div>
        </div>

        {cleanNumber && (
          <div className="flex items-center gap-2 shrink-0 self-end md:self-center pl-12 md:pl-0">
            <a
              id="btn-whatsapp-banner-distribuidor"
              href={wsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-colors whitespace-nowrap"
            >
              <MessageCircle className="w-4 h-4 fill-white/20" />
              <span>Contactar Distribuidor</span>
              <ExternalLink className="w-3 h-3 opacity-70" />
            </a>
          </div>
        )}
      </div>

      {/* Botón cerrar banner */}
      <button
        id="btn-cerrar-banner-distribuidor"
        onClick={() => setVisible(false)}
        type="button"
        title="Cerrar aviso"
        aria-label="Cerrar aviso"
        className="absolute right-3.5 top-3.5 text-neutral-400 hover:text-neutral-700 p-1 rounded-lg hover:bg-black/5 transition-colors cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
