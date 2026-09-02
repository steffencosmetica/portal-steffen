import React from 'react';
import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import { MailCheck, ArrowRight, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface VerificaEmailPageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function VerificaEmailPage({ searchParams }: VerificaEmailPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const emailParam = resolvedSearchParams.email;
  const email = typeof emailParam === 'string' ? decodeURIComponent(emailParam) : null;

  return (
    <div id="verifica-email-container" className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col justify-between p-4 md:p-8">
      {/* Header Compartido */}
      <SiteHeader
        sesion={false}
        mostrarCarrito={false}
        mostrarCatalogo={false}
        mostrarInicio={true}
      />

      {/* Contenedor Principal */}
      <main className="max-w-xl mx-auto w-full py-10 md:py-16">
        <div className="bg-white border border-neutral-200 rounded-3xl p-8 md:p-12 shadow-sm text-center">
          {/* Ícono de confirmación */}
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gold-50 border border-gold-200 flex items-center justify-center text-gold-600 shadow-sm">
            <MailCheck className="w-8 h-8 text-gold-600" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold uppercase tracking-wider bg-gold-50 text-gold-800 border border-gold-300 rounded-full mb-4">
            <Sparkles className="w-3.5 h-3.5 text-gold-600" /> Confirmación de Cuenta
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold text-neutral-900 tracking-tight">
            ¡Ya casi estás!
          </h1>

          <p className="text-neutral-600 text-sm md:text-base mt-4 leading-relaxed max-w-md mx-auto">
            Te enviamos un mail de verificación a{' '}
            {email ? (
              <strong className="text-neutral-900 font-semibold">{email}</strong>
            ) : (
              'tu casilla de correo'
            )}
            . Revisá tu bandeja de entrada (y la carpeta de spam) y hacé clic en el enlace para activar tu cuenta.
          </p>

          <div className="mt-8 pt-8 border-t border-neutral-100 flex flex-col items-center gap-4">
            <Link
              href="/login"
              id="btn-ir-login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-white font-bold text-sm shadow-md shadow-gold-500/20 transition-all cursor-pointer"
            >
              <span>Iniciar sesión</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <p className="text-xs text-neutral-400 mt-2">
              Una vez confirmado tu correo, podrás acceder con tu contraseña.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto w-full py-4 text-center text-xs text-neutral-500 border-t border-neutral-200">
        © {new Date().getFullYear()} Steffen Cosmética Capilar • Portal de Acceso Profesional
      </footer>
    </div>
  );
}
