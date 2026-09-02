import NextLink from 'next/link';
import Image from 'next/image';
import { 
  CheckCircle2, 
  Sparkles, 
  ArrowRight, 
  ShoppingBag, 
  Clock, 
  MessageCircle,
  Tag
} from 'lucide-react';
import { obtenerNumeroWhatsapp } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

export default function CuentaConfirmadaPage() {
  const numero = obtenerNumeroWhatsapp();
  const whatsappUrl = numero 
    ? `https://api.whatsapp.com/send?phone=${numero.replace(/\D/g, '')}&text=${encodeURIComponent('Hola Steffen! Acabo de confirmar mi registro en el portal profesional y quisiera consultar sobre mi cuenta.')}`
    : 'https://api.whatsapp.com/send?text=Hola%20Steffen!';

  return (
    <div 
      id="cuenta-confirmada-root" 
      className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col justify-between p-4 md:p-8"
    >
      {/* Encabezado con Logo Steffen */}
      <header className="max-w-lg mx-auto w-full py-4 flex items-center justify-center border-b border-neutral-200">
        <NextLink href="/" className="relative h-10 w-36 hover:opacity-90 transition-opacity">
          <Image
            src="/loguito.png"
            alt="Steffen Cosmética Capilar"
            fill
            className="object-contain"
            priority
          />
        </NextLink>
      </header>

      {/* Contenedor Principal */}
      <main className="max-w-lg mx-auto w-full my-auto py-8">
        <div className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8 md:p-10 shadow-sm text-center space-y-6">
          
          {/* Ícono de Éxito */}
          <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
            <div className="absolute inset-0 rounded-3xl bg-emerald-100/60 animate-ping opacity-30" />
            <div className="relative w-20 h-20 rounded-3xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shadow-xs">
              <CheckCircle2 className="w-10 h-10 stroke-[2.2]" />
            </div>
          </div>

          {/* Título y Estado */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Registro confirmado con éxito</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
              ¡Tu cuenta ha sido registrada correctamente!
            </h1>
            <p className="text-sm text-neutral-600 leading-relaxed max-w-md mx-auto">
              Hemos validado tu correo electrónico y recibido los datos de tu salón en nuestro sistema.
            </p>
          </div>

          {/* Banner de Beneficio 20% OFF */}
          <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-800 text-white text-left shadow-md border border-neutral-800">
            <div className="flex items-start gap-3.5 relative z-10">
              <div className="w-10 h-10 rounded-xl bg-gold-500/20 border border-gold-500/40 flex items-center justify-center text-gold-400 shrink-0 mt-0.5">
                <Tag className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-gold-400">
                    Beneficio de Bienvenida
                  </span>
                  <span className="bg-gold-500 text-neutral-950 text-[10px] font-black px-2 py-0.5 rounded-full">
                    20% OFF
                  </span>
                </div>
                <p className="text-sm font-semibold text-white">
                  Ya podés disfrutar de un 20% de descuento en tu primera compra
                </p>
                <p className="text-xs text-neutral-300">
                  Iniciá sesión para armar tu pedido profesional directo de fábrica y se aplicará automáticamente al confirmar.
                </p>
              </div>
            </div>
          </div>

          {/* Tarjeta Informativa sobre Aprobación de Cuenta */}
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 border border-amber-200 text-left space-y-2 text-xs sm:text-sm text-amber-900">
            <div className="flex items-center gap-2 font-bold text-amber-950">
              <Clock className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Aprobación de cuenta profesional</span>
            </div>
            <p className="text-amber-800 leading-relaxed text-xs">
              Tu solicitud está en proceso de verificación por nuestro equipo comercial. Una vez aprobada tu cuenta de salón, tendrás acceso pleno a las listas de precios profesionales exclusivas, promociones por volumen y asignación directa de tu distribuidor oficial.
            </p>
          </div>

          {/* Botones de Acción */}
          <div className="space-y-3 pt-2">
            <NextLink
              href="/login"
              id="btn-confirmada-login"
              className="w-full py-3.5 px-5 rounded-xl bg-gold-500 hover:bg-gold-400 active:scale-[0.99] text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-md shadow-gold-500/25 transition-all cursor-pointer"
            >
              <span>Iniciar Sesión en el Portal</span>
              <ArrowRight className="w-4 h-4" />
            </NextLink>

            <NextLink
              href="/catalogo"
              id="btn-confirmada-catalogo"
              className="w-full py-3 px-4 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 border border-neutral-200 transition-colors cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4 text-neutral-600" />
              <span>Explorar Catálogo de Productos</span>
            </NextLink>
          </div>

          {/* Contacto Directo WhatsApp */}
          <div className="pt-2 border-t border-neutral-100">
            <p className="text-xs text-neutral-500 mb-2">
              ¿Tenés dudas o necesitás asistencia inmediata para tu salón?
            </p>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100/80 px-3 py-1.5 rounded-full border border-emerald-200 transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5 fill-emerald-600 stroke-emerald-50" />
              <span>Contactar a Steffen por WhatsApp</span>
            </a>
          </div>
        </div>
      </main>

      {/* Pie de Página */}
      <footer className="max-w-lg mx-auto w-full py-4 text-center text-xs text-neutral-500 border-t border-neutral-200">
        © {new Date().getFullYear()} Steffen Cosmética Capilar • Venta Directa y Distribución a Salones
      </footer>
    </div>
  );
}
