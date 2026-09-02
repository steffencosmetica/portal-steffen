'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { X, Clock, Mail, CheckCircle2 } from 'lucide-react';

interface AlertaCuentaPendienteModalProps {
  initialOpen?: boolean;
}

function AlertaCuentaPendienteContent({ initialOpen = false }: AlertaCuentaPendienteModalProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [dismissed, setDismissed] = useState(false);

  const cuenta = searchParams.get('cuenta');
  const isOpen = (cuenta === 'pendiente' || initialOpen) && !dismissed;

  const handleClose = () => {
    setDismissed(true);

    // Limpiar los parámetros de la URL sin recargar la página
    try {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('cuenta');
      const newQuery = params.toString();
      const newUrl = newQuery ? `${pathname}?${newQuery}` : pathname;
      router.replace(newUrl, { scroll: false });
    } catch {
      // Si falla la manipulación de params, continuar
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="modal-alerta-cuenta-pendiente"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-sm animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-alerta-cuenta-pendiente-titulo"
    >
      <div
        className="relative w-full max-w-lg bg-white text-neutral-900 rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300"
      >
        {/* Luces sutiles de fondo */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-48 h-48 bg-gold-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Botón Cerrar (Cruz) */}
        <button
          id="btn-cerrar-alerta-cuenta-pendiente"
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
          aria-label="Cerrar ventana"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="relative space-y-5">
          {/* Ícono de Estado */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 shadow-xs">
              <Clock className="w-6 h-6" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
              <Mail className="w-3.5 h-3.5 text-amber-600" />
              <span>Verificación de Salón</span>
            </div>
          </div>

          {/* Título */}
          <h2
            id="modal-alerta-cuenta-pendiente-titulo"
            className="text-xl sm:text-2xl font-extrabold text-neutral-900 tracking-tight leading-snug"
          >
            Tu cuenta profesional está en revisión
          </h2>

          {/* Descripción */}
          <div className="space-y-3 text-sm text-neutral-600 leading-relaxed">
            <p>
              Te enviamos un aviso a tu email. La aprobación de tu cuenta profesional puede demorar hasta 24hs.
            </p>
            <p className="bg-neutral-50 border border-neutral-200/80 rounded-xl p-3 text-xs text-neutral-700 font-medium">
              Mientras tanto, podés seguir navegando el catálogo con precios públicos de referencia.
            </p>
          </div>

          {/* Botón de acción */}
          <div className="pt-2">
            <button
              id="btn-modal-cuenta-pendiente-entendido"
              type="button"
              onClick={handleClose}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-sm shadow-md transition-all hover:scale-[1.005] cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-gold-400" />
              <span>Entendido</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AlertaCuentaPendienteModal({ initialOpen }: AlertaCuentaPendienteModalProps) {
  return (
    <Suspense fallback={null}>
      <AlertaCuentaPendienteContent initialOpen={initialOpen} />
    </Suspense>
  );
}
