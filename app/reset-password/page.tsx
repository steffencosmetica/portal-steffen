'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { SiteHeader } from '@/components/SiteHeader';
import { 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  KeyRound,
  RotateCcw,
  ShieldCheck
} from 'lucide-react';

function ResetPasswordFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [mostrarConfirmPassword, setMostrarConfirmPassword] = useState(false);

  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLinkInvalid, setIsLinkInvalid] = useState(false);
  const [isVerifyingSession, setIsVerifyingSession] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(4);

  // 1. Detección y verificación del enlace de recuperación de Supabase
  useEffect(() => {
    const supabase = createClient();

    // Si la URL viene con parámetros de error desde el servidor o Supabase (ej: enlace expirado)
    const errorParam = searchParams.get('error') || searchParams.get('error_code');
    const errorDesc = searchParams.get('error_description');

    if (errorParam || (errorDesc && errorDesc.toLowerCase().includes('expired'))) {
      setIsLinkInvalid(true);
      setIsVerifyingSession(false);
      return;
    }

    // Escuchar cambios de estado de autenticación (evento PASSWORD_RECOVERY o INITIAL_SESSION)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (session && session.user)) {
        setIsLinkInvalid(false);
        setIsVerifyingSession(false);
      }
    });

    // Verificar si ya hay una sesión de recuperación activa en el cliente
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Error al obtener sesión de recuperación:', error);
        setIsLinkInvalid(true);
      } else if (!session) {
        // En Next.js SSR o con hash fragments, dar un breve margen para que Supabase capture el hash de la URL
        const hasHashFragment = typeof window !== 'undefined' && window.location.hash.includes('access_token');
        if (!hasHashFragment) {
          // Si no hay hash ni sesión previa tras 1.5s, marcar como no válido
          const timeout = setTimeout(() => {
            supabase.auth.getSession().then(({ data: { session: retrySession } }) => {
              if (!retrySession) {
                setIsLinkInvalid(true);
              }
              setIsVerifyingSession(false);
            });
          }, 1200);
          return () => clearTimeout(timeout);
        }
      } else {
        setIsLinkInvalid(false);
        setIsVerifyingSession(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [searchParams]);

  // 2. Contador de redirección automática tras éxito
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isSuccess && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (isSuccess && countdown === 0) {
      router.push('/login');
    }
    return () => clearTimeout(timer);
  }, [isSuccess, countdown, router]);

  // 3. Enviar nueva contraseña
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validaciones
    if (!password || !confirmPassword) {
      setErrorMessage('Por favor completá todos los campos.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('La contraseña debe tener una longitud mínima de 8 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden. Por favor verificalas.');
      return;
    }

    setIsPending(true);

    try {
      const supabase = createClient();
      
      // Actualizar la contraseña del usuario en Supabase Auth
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        console.error('Error al actualizar contraseña en Supabase:', error);
        
        if (error.message.toLowerCase().includes('same password')) {
          setErrorMessage('La nueva contraseña debe ser diferente a la actual.');
        } else if (
          error.message.toLowerCase().includes('expired') || 
          error.message.toLowerCase().includes('invalid token') ||
          error.status === 401
        ) {
          setIsLinkInvalid(true);
        } else {
          setErrorMessage(error.message || 'No se pudo actualizar la contraseña. Intentá nuevamente.');
        }
        setIsPending(false);
        return;
      }

      // Cerrar sesión para que ingrese limpiamente desde el login
      await supabase.auth.signOut();
      
      setIsSuccess(true);
    } catch (err) {
      console.error('Error inesperado al actualizar contraseña:', err);
      setErrorMessage('Ocurrió un error inesperado. Por favor intentá nuevamente.');
    } finally {
      setIsPending(false);
    }
  };

  // ESTADO 1: Verificando sesión inicial
  if (isVerifyingSession && !isLinkInvalid) {
    return (
      <div className="bg-white border border-neutral-200 rounded-2xl p-8 shadow-sm text-center space-y-4">
        <div className="w-10 h-10 border-3 border-gold-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-semibold text-neutral-700">
          Verificando enlace de recuperación...
        </p>
      </div>
    );
  }

  // ESTADO 2: Enlace expirado o inválido
  if (isLinkInvalid) {
    return (
      <div className="bg-white border border-neutral-200 rounded-2xl p-6 md:p-8 shadow-sm text-center space-y-6 animate-in fade-in duration-300">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-xs">
          <AlertCircle className="w-7 h-7 text-amber-600" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl md:text-2xl font-bold text-neutral-900 tracking-tight">
            El enlace no es válido o ya expiró
          </h1>
          <p className="text-neutral-600 text-xs md:text-sm leading-relaxed max-w-sm mx-auto">
            Por razones de seguridad, los enlaces para restablecer contraseña son de un solo uso y tienen un tiempo de validez limitado.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <Link
            href="/forgot-password"
            id="btn-solicitar-nuevo-enlace"
            className="w-full py-3 px-4 rounded-xl bg-gold-500 hover:bg-gold-400 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-gold-500/20 transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Solicitar un nuevo enlace</span>
          </Link>

          <Link
            href="/login"
            className="w-full py-2.5 px-4 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold text-xs transition-colors block text-center"
          >
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    );
  }

  // ESTADO 3: Contraseña actualizada con éxito
  if (isSuccess) {
    return (
      <div className="bg-white border border-neutral-200 rounded-2xl p-6 md:p-8 shadow-sm text-center space-y-6 animate-in fade-in duration-300">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-xs">
          <CheckCircle2 className="w-7 h-7 text-emerald-600" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Seguridad actualizada</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-neutral-900 tracking-tight">
            Tu contraseña fue actualizada correctamente
          </h1>
          <p className="text-neutral-600 text-xs md:text-sm leading-relaxed max-w-sm mx-auto">
            Ya podés ingresar a tu cuenta y catálogo profesional con tu nueva clave de acceso.
          </p>
        </div>

        <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs text-neutral-500">
          Redirigiendo automáticamente en <strong className="text-neutral-900 font-bold">{countdown}</strong> segundos...
        </div>

        <div className="pt-2">
          <Link
            href="/login"
            id="btn-ir-login-actualizado"
            className="w-full py-3 px-4 rounded-xl bg-gold-500 hover:bg-gold-400 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-gold-500/20 transition-all cursor-pointer"
          >
            <span>Ingresar ahora</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  // ESTADO 4: Formulario para ingresar nueva contraseña
  return (
    <div className="bg-white border border-neutral-200 rounded-2xl p-6 md:p-8 shadow-sm">
      {/* Encabezado */}
      <div className="mb-6 text-center">
        <div className="w-12 h-12 mx-auto mb-3.5 rounded-2xl bg-gold-50 border border-gold-200 flex items-center justify-center text-gold-600 shadow-xs">
          <KeyRound className="w-6 h-6 text-gold-600" />
        </div>
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
          Crear nueva contraseña
        </h1>
        <p className="text-neutral-500 text-xs md:text-sm mt-1.5">
          Elegí una contraseña segura de al menos 8 caracteres para tu cuenta.
        </p>
      </div>

      {/* Mensaje de Error */}
      {errorMessage && (
        <div 
          id="error-message-reset" 
          className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-red-700 text-xs md:text-sm animate-in fade-in duration-200"
        >
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
          <div>
            <p className="font-bold text-red-800">Error</p>
            <p className="mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="space-y-4" id="form-reset-password">
        <div>
          <label className="block text-xs font-semibold text-neutral-700 mb-1.5" htmlFor="new-password">
            Nueva contraseña *
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              id="new-password"
              name="password"
              type={mostrarPassword ? 'text' : 'password'}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
              className="w-full bg-white border border-neutral-300 rounded-xl pl-10 pr-10 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
            />
            <button
              type="button"
              id="btn-toggle-password-reset"
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

        <div>
          <label className="block text-xs font-semibold text-neutral-700 mb-1.5" htmlFor="confirm-password">
            Confirmar nueva contraseña *
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              id="confirm-password"
              name="confirmPassword"
              type={mostrarConfirmPassword ? 'text' : 'password'}
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repetí tu nueva contraseña"
              autoComplete="new-password"
              className="w-full bg-white border border-neutral-300 rounded-xl pl-10 pr-10 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
            />
            <button
              type="button"
              id="btn-toggle-confirm-password-reset"
              onClick={() => setMostrarConfirmPassword(!mostrarConfirmPassword)}
              aria-label={mostrarConfirmPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              className="absolute right-3 top-2.5 p-1 text-neutral-400 hover:text-neutral-600 transition-colors rounded-lg focus:outline-none cursor-pointer"
            >
              {mostrarConfirmPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <button
          id="btn-guardar-nueva-password"
          type="submit"
          disabled={isPending}
          className="w-full mt-2 py-3 px-4 rounded-xl bg-gold-500 hover:bg-gold-400 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-gold-500/20 cursor-pointer"
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Guardando contraseña...
            </span>
          ) : (
            <>
              <span>Guardar nueva contraseña</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div 
      id="reset-password-container" 
      className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col justify-between p-4 md:p-8"
    >
      {/* Header Compartido */}
      <SiteHeader
        sesion={false}
        mostrarCarrito={false}
        mostrarCatalogo={false}
        mostrarInicio={true}
      />

      {/* Main Content */}
      <main className="max-w-md mx-auto w-full py-8 md:py-12">
        <Suspense fallback={
          <div className="bg-white border border-neutral-200 rounded-2xl p-8 shadow-sm text-center">
            <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-neutral-500">Cargando...</p>
          </div>
        }>
          <ResetPasswordFormContent />
        </Suspense>
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto w-full py-4 text-center text-xs text-neutral-500 border-t border-neutral-200">
        © {new Date().getFullYear()} Steffen Cosmética Capilar • Portal de Acceso Profesional
      </footer>
    </div>
  );
}
