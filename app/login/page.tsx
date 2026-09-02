'use client';

import React, { useActionState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { loginAction, LoginFormState } from '@/app/actions/auth';
import { SiteHeader } from '@/components/SiteHeader';
import { 
  ArrowRight, 
  AlertCircle, 
  Lock, 
  Mail, 
  ShieldCheck,
  Eye,
  EyeOff
} from 'lucide-react';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get('redirect') || '';

  const [mostrarPassword, setMostrarPassword] = React.useState(false);
  const [state, formAction, isPending] = useActionState<LoginFormState, FormData>(
    loginAction,
    {}
  );

  React.useEffect(() => {
    if (state.success && state.redirectTo) {
      window.location.href = state.redirectTo;
    }
  }, [state]);

  return (
    <div className="bg-white border border-neutral-200 rounded-2xl p-6 md:p-8 shadow-sm">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
          Ingreso a Salones
        </h1>
        <p className="text-neutral-500 text-xs md:text-sm mt-1.5">
          Accedé a tu catálogo con precios profesionales y realizá tus pedidos directos de fábrica.
        </p>
      </div>

      {/* Mensaje de Error */}
      {state.error && (
        <div id="error-message-login" className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-red-700 text-xs md:text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
          <div>
            <p className="font-bold text-red-800">Error al iniciar sesión</p>
            <p className="mt-0.5">{state.error}</p>
          </div>
        </div>
      )}

      {/* Formulario */}
      <form action={formAction} className="space-y-4" id="form-login">
        {redirectParam && (
          <input type="hidden" name="redirect" value={redirectParam} />
        )}

        <div>
          <label className="block text-xs font-semibold text-neutral-700 mb-1.5" htmlFor="email">
            Email
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="salon@ejemplo.com"
              className="w-full bg-white border border-neutral-300 rounded-xl pl-10 pr-3 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-neutral-700" htmlFor="password">
              Contraseña
            </label>
            <Link
              href="/forgot-password"
              id="link-olvide-password"
              className="text-xs text-gold-600 hover:text-gold-700 hover:underline font-medium transition-colors"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              id="password"
              name="password"
              type={mostrarPassword ? 'text' : 'password'}
              required
              placeholder="••••••••"
              className="w-full bg-white border border-neutral-300 rounded-xl pl-10 pr-10 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
            />
            <button
              type="button"
              id="btn-toggle-password-login"
              onClick={() => setMostrarPassword(!mostrarPassword)}
              aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              className="absolute right-3 top-2.5 p-1 text-neutral-400 hover:text-neutral-600 transition-colors rounded-lg focus:outline-none cursor-pointer"
            >
              {mostrarPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <button
          id="btn-login"
          type="submit"
          disabled={isPending}
          className="w-full mt-2 py-3 px-4 rounded-xl bg-gold-500 hover:bg-gold-400 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-gold-500/20 cursor-pointer"
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Iniciando sesión...
            </span>
          ) : (
            <>
              <span>Ingresar a la Cuenta</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-neutral-200 text-center">
        <p className="text-xs text-neutral-500">
          ¿Aún no diste de alta tu peluquería?{' '}
          <Link href="/registro" className="text-gold-600 font-semibold hover:underline">
            Registrar salón
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div id="login-container" className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col justify-between p-4 md:p-8">
      {/* Header Compartido */}
      <SiteHeader
        sesion={false}
        mostrarCarrito={false}
        mostrarCatalogo={false}
        mostrarInicio={true}
      />

      {/* Main Card */}
      <main className="max-w-md mx-auto w-full py-8 md:py-12">
        <Suspense fallback={<div className="p-8 text-center text-sm text-neutral-400">Cargando...</div>}>
          <LoginFormContent />
        </Suspense>
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto w-full py-4 text-center text-xs text-neutral-500 border-t border-neutral-200">
        © {new Date().getFullYear()} Steffen Cosmética Capilar • Portal de Acceso Profesional
      </footer>
    </div>
  );
}
