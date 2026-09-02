'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { X, Sparkles, ArrowRight, LogIn } from 'lucide-react';

const STORAGE_KEY = 'steffen_alerta_registro_vista';

interface AlertaRegistroModalProps {
  delayMs?: number;
}

export function AlertaRegistroModal({ delayMs = 15000 }: AlertaRegistroModalProps = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Verificar si ya se mostró en esta sesión de navegador
    try {
      const yaVisto = sessionStorage.getItem(STORAGE_KEY);
      if (!yaVisto) {
        // Retraso de 15 segundos para no ser invasivo al ingresar al portal
        const timer = setTimeout(() => {
          setIsOpen(true);
        }, delayMs);
        return () => clearTimeout(timer);
      }
    } catch {
      // Ignorar errores de sessionStorage (ej. modo incógnito estricto)
    }
  }, [delayMs]);

  const marcarComoVisto = () => {
    try {
      sessionStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // Ignorar errores de sessionStorage
    }
  };

  const handleClose = () => {
    marcarComoVisto();
    setIsOpen(false);
  };

  const handleNavegar = (href: string) => {
    marcarComoVisto();
    setIsOpen(false);
    router.push(href);
  };

  if (!isOpen) return null;

  return (
    <div
      id="modal-alerta-registro"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-sm animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-alerta-registro-titulo"
    >
      <div
        className="relative w-full max-w-lg bg-neutral-950 text-white rounded-3xl p-6 sm:p-8 border border-neutral-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300"
      >
        {/* Luces sutiles de fondo */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-gold-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-64 h-64 bg-gold-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Botón Cerrar (Cruz) */}
        <button
          id="btn-cerrar-alerta-registro"
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800/80 transition-colors focus:outline-none focus:ring-2 focus:ring-gold-400"
          aria-label="Cerrar ventana"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="relative space-y-5">
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold-500/10 border border-gold-500/30 text-gold-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Beneficio Exclusivo para Salones</span>
          </div>

          {/* Título */}
          <h2
            id="modal-alerta-registro-titulo"
            className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug"
          >
            ¡Bienvenido a Steffen Profesional!
          </h2>

          {/* Descripción */}
          <p className="text-sm sm:text-base text-neutral-300 leading-relaxed font-light">
            Registrate como salón profesional y accedé a un{' '}
            <strong className="text-gold-400 font-semibold">20% OFF en tu primera compra</strong>, directo de fábrica.
          </p>

          {/* Botones de acción */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              id="btn-modal-quiero-descuento"
              type="button"
              onClick={() => handleNavegar('/registro')}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gold-500 hover:bg-gold-400 text-neutral-950 font-bold text-sm shadow-lg shadow-gold-500/20 transition-all hover:scale-[1.01] cursor-pointer"
            >
              <span>Quiero mi descuento</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              id="btn-modal-ya-registrado"
              type="button"
              onClick={() => handleNavegar('/login')}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 hover:text-white border border-neutral-700 hover:border-neutral-600 font-medium text-xs sm:text-sm transition-all cursor-pointer"
            >
              <LogIn className="w-4 h-4 text-gold-400" />
              <span>Ya estoy registrado, ingresar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
