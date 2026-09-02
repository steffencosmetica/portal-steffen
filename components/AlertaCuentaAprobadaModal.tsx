'use client';

import React, { useState, useTransition, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { 
  X, 
  Sparkles, 
  CheckCircle2, 
  ShoppingBag, 
  Tag, 
  Layers, 
  Repeat, 
  Truck, 
  BookOpen, 
  ArrowRight,
  ShieldCheck,
  Gift
} from 'lucide-react';
import { marcarAlertaAprobacionVistaAction } from '@/app/actions/auth';

export interface AlertaCuentaAprobadaModalProps {
  initialOpen?: boolean;
  salonNombre?: string | null;
  nombreCliente?: string | null;
  tieneDistribuidor?: boolean;
}

function AlertaCuentaAprobadaContent({
  initialOpen = false,
  salonNombre,
  nombreCliente,
  tieneDistribuidor = false,
}: AlertaCuentaAprobadaModalProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [dismissed, setDismissed] = useState(false);
  const [isPending, startTransition] = useTransition();

  const cuentaParam = searchParams.get('cuenta');
  const isOpen = (cuentaParam === 'aprobada' || initialOpen) && !dismissed;

  const handleDismiss = async (redirigirACatalogo: boolean = false) => {
    setDismissed(true);

    // Limpiar el query param `cuenta` de la URL sin recargar
    try {
      const params = new URLSearchParams(searchParams.toString());
      if (params.has('cuenta')) {
        params.delete('cuenta');
        const newQuery = params.toString();
        const newUrl = newQuery ? `${pathname}?${newQuery}` : pathname;
        router.replace(newUrl, { scroll: false });
      }
    } catch {
      // Continuar si falla la manipulación de query params
    }

    // Persistir en base de datos que el usuario ya vio la alerta de activación
    try {
      startTransition(async () => {
        await marcarAlertaAprobacionVistaAction();
      });
    } catch (err) {
      console.error('Error al marcar alerta de activación:', err);
    }

    if (redirigirACatalogo) {
      if (pathname !== '/catalogo') {
        router.push('/catalogo');
      }
    }
  };

  if (!isOpen) return null;

  const nombreMostrar = salonNombre || nombreCliente || 'Profesional';

  const beneficios = [
    {
      icono: Tag,
      titulo: 'Precios de Salón Directos de Fábrica',
      descripcion: 'Acceso desbloqueado a los precios diferenciales mayoristas en todo el catálogo.',
      badge: 'Precio Salón Profesional',
      badgeColor: 'bg-gold-50 text-gold-900 border-gold-300',
    },
    {
      icono: Gift,
      titulo: '20% OFF en tu Primer Pedido',
      descripcion: 'Descuento exclusivo de bienvenida aplicado automáticamente en tu primera compra.',
      badge: 'Bienvenida',
      badgeColor: 'bg-emerald-50 text-emerald-900 border-emerald-300',
    },
    {
      icono: Layers,
      titulo: 'Packs y Combos Exclusivos',
      descripcion: 'Kits técnicos y de reventa formulados para maximizar la rentabilidad de tu salón.',
      badge: 'Packs Salón',
      badgeColor: 'bg-blue-50 text-blue-900 border-blue-200',
    },
    // El sistema de reposición continua solo aplica a salones de venta directa (sin distribuidor asignado)
    ...(!tieneDistribuidor
      ? [
          {
            icono: Repeat,
            titulo: 'Descuentos por Reposición Continua',
            descripcion: 'Mantené hasta un 15% OFF al reponer tu stock con regularidad (cada 30 a 45 días).',
            badge: 'Fidelidad',
            badgeColor: 'bg-amber-50 text-amber-900 border-amber-300',
          },
        ]
      : [
          {
            icono: ShieldCheck,
            titulo: 'Atención de Distribuidor Oficial',
            descripcion: 'Acompañamiento personalizado y entrega ágil en tu zona a través de tu representante oficial.',
            badge: 'Cobertura Oficial',
            badgeColor: 'bg-amber-50 text-amber-900 border-amber-300',
          },
        ]),
    {
      icono: BookOpen,
      titulo: 'Guías y Material Técnico',
      descripcion: 'Manuales de aplicación paso a paso, fichas de producto y placas listas para tus redes.',
      badge: 'Recursos',
      badgeColor: 'bg-purple-50 text-purple-900 border-purple-200',
    },
    {
      icono: Truck,
      titulo: tieneDistribuidor ? 'Entrega en tu Localidad' : 'Envíos a Todo el País',
      descripcion: tieneDistribuidor
        ? 'Coordinación directa de entrega en la puerta de tu peluquería o salón profesional.'
        : 'Despacho asegurado directo a la puerta de tu peluquería o salón profesional.',
      badge: tieneDistribuidor ? 'Zona Oficial' : 'Nacional',
      badgeColor: 'bg-neutral-100 text-neutral-800 border-neutral-300',
    },
  ];

  return (
    <div
      id="modal-alerta-cuenta-aprobada"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-neutral-950/75 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-alerta-cuenta-aprobada-titulo"
    >
      <div
        className="relative w-full max-w-2xl bg-white text-neutral-900 rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-300"
      >
        {/* Fondos luminosos sutiles */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-gold-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Botón Cerrar (Cruz) */}
        <button
          id="btn-cerrar-alerta-cuenta-aprobada"
          type="button"
          onClick={() => handleDismiss(false)}
          className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors focus:outline-none focus:ring-2 focus:ring-gold-400 cursor-pointer"
          aria-label="Cerrar ventana"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="relative space-y-6">
          {/* Header con Badge de Celebración y Verificación */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Salón Verificado y Habilitado</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold-50 border border-gold-300 text-gold-900 text-xs font-bold shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-gold-600" />
                <span>Precio Profesional Activo</span>
              </div>
            </div>

            {/* Título Principal */}
            <div>
              <h2
                id="modal-alerta-cuenta-aprobada-titulo"
                className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight leading-tight"
              >
                ¡Tu cuenta fue habilitada para Precio Profesional! 🎉
              </h2>
              <p className="text-sm sm:text-base text-neutral-600 mt-1.5 leading-relaxed">
                ¡Hola, <span className="font-bold text-neutral-900">{nombreMostrar}</span>! Tu registro fue aprobado por el equipo de Steffen. Ya podés comprar con <strong className="text-neutral-900">Precios de Salón Profesional directos de fábrica</strong> y disfrutar de todos los beneficios exclusivos para tu negocio.
              </p>
            </div>
          </div>

          {/* Grilla de Beneficios Exclusivos */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Tus beneficios habilitados:
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[42vh] sm:max-h-none overflow-y-auto pr-1">
              {beneficios.map((ben, idx) => {
                const IconComponent = ben.icono;
                return (
                  <div
                    key={idx}
                    className="p-3 sm:p-3.5 rounded-2xl bg-neutral-50/90 border border-neutral-200/80 flex items-start gap-3 transition-colors hover:bg-white hover:border-gold-300 shadow-2xs"
                  >
                    <div className="w-8 h-8 rounded-xl bg-white border border-neutral-200 flex items-center justify-center text-gold-600 shrink-0 shadow-xs">
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <h4 className="text-xs sm:text-sm font-bold text-neutral-900 leading-tight">
                          {ben.titulo}
                        </h4>
                      </div>
                      <p className="text-[11px] sm:text-xs text-neutral-600 leading-snug">
                        {ben.descripcion}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Banner resumen de 20% OFF primer pedido */}
          <div className="p-3.5 rounded-2xl bg-gold-50 border border-gold-300 flex items-center justify-between gap-3 text-gold-950">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gold-500 text-neutral-950 flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                20%
              </div>
              <p className="text-xs font-semibold leading-tight">
                Recordá que en tu primer pedido tenés un <strong className="font-extrabold text-gold-900">20% de descuento directo</strong> sobre el precio profesional de fábrica.
              </p>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              id="btn-modal-cuenta-aprobada-hacer-pedido"
              type="button"
              onClick={() => handleDismiss(true)}
              className="flex-1 inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-neutral-950 font-bold text-sm sm:text-base shadow-lg shadow-gold-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            >
              <ShoppingBag className="w-5 h-5" />
              <span>Hacer mi pedido</span>
              <ArrowRight className="w-4 h-4 ml-0.5" />
            </button>

            <button
              id="btn-modal-cuenta-aprobada-cerrar"
              type="button"
              onClick={() => handleDismiss(false)}
              className="px-5 py-3 rounded-xl bg-white hover:bg-neutral-100 text-neutral-700 font-semibold text-xs sm:text-sm border border-neutral-200 transition-colors cursor-pointer text-center"
            >
              Explorar después
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AlertaCuentaAprobadaModal(props: AlertaCuentaAprobadaModalProps) {
  return (
    <Suspense fallback={null}>
      <AlertaCuentaAprobadaContent {...props} />
    </Suspense>
  );
}
