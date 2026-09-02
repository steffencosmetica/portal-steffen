import NextLink from 'next/link';
import Image from 'next/image';
import { logoutAction } from '@/app/actions/logout';
import { ShieldAlert, LogOut, MessageSquare } from 'lucide-react';
import { obtenerNumeroWhatsappOFallar } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

export default function CuentaBloqueadaPage() {
  let whatsappUrl = 'https://wa.me/';
  try {
    const num = obtenerNumeroWhatsappOFallar();
    whatsappUrl = `https://wa.me/${num}?text=${encodeURIComponent('Hola Steffen, mi cuenta profesional se encuentra bloqueada y quisiera consultar el motivo.')}`;
  } catch {
    // fallback
  }

  return (
    <div id="cuenta-bloqueada-root" className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col justify-between p-4 md:p-8">
      {/* Header */}
      <header className="max-w-md mx-auto w-full py-4 flex items-center justify-center border-b border-neutral-200">
        <NextLink href="/" className="relative h-9 w-32">
          <Image
            src="/loguito.png"
            alt="Steffen Cosmética Capilar"
            fill
            className="object-contain"
            priority
          />
        </NextLink>
      </header>

      {/* Main Box */}
      <main className="max-w-md mx-auto w-full my-auto py-8">
        <div className="bg-white border border-red-200 rounded-3xl p-6 md:p-8 shadow-sm text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-100">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl md:text-2xl font-bold text-neutral-900 tracking-tight">
              Cuenta Bloqueada
            </h1>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Tu cuenta profesional en el Portal Steffen se encuentra temporalmente inhabilitada o bloqueada por administración.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-600 text-left space-y-2">
            <p className="font-semibold text-neutral-800">¿Qué puedo hacer?</p>
            <p>
              Si creés que se trata de un error o deseás regularizar tu estado de cliente para reactivar el acceso al catálogo profesional y precios salón, comunicate con nuestro equipo comercial.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 fill-white" />
              <span>Contactar Soporte por WhatsApp</span>
            </a>

            <form action={logoutAction}>
              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold text-xs flex items-center justify-center gap-2 border border-neutral-300 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-neutral-500" />
                <span>Cerrar Sesión</span>
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-md mx-auto w-full py-4 text-center text-xs text-neutral-500 border-t border-neutral-200">
        © {new Date().getFullYear()} Steffen Cosmética Capilar
      </footer>
    </div>
  );
}
