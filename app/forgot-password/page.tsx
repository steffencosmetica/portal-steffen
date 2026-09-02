'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { SiteHeader } from '@/components/SiteHeader';
import { 
  Mail, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  ArrowLeft, 
  KeyRound,
  Sparkles
} from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    
    // Validación de formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setErrorMessage('Por favor ingresá un correo electrónico válido.');
      return;
    }

    setIsPending(true);

    try {
      const supabase = createClient();
      
      // Construir la URL de redirección absoluta respetando el origen actual
      const redirectUrl = `${window.location.origin}/auth/callback?next=/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: redirectUrl,
      });

      if (error) {
        console.error('Error al solicitar recuperación de contraseña:', error);
        // Si es un error de límite de velocidad (rate limit), avisar de forma amigable
        if (error.status === 429 || error.message.toLowerCase().includes('rate limit')) {
          setErrorMessage('Demasiadas solicitudes enviadas en poco tiempo. Por favor aguardá unos minutos.');
          setIsPending(false);
          return;
        }
      }

      // Por seguridad y para evitar enumeración de usuarios, siempre mostramos estado de éxito
      setIsSent(true);
    } catch (err) {
      console.error('Error inesperado:', err);
      // Mantener respuesta genérica o error de conexión
      setErrorMessage('Ocurrió un error inesperado al procesar la solicitud. Verificá tu conexión e intentá nuevamente.');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div 
      id="forgot-password-container" 
      className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col justify-between p-4 md:p-8"
    >
      {/* Header Compartido */}
      <SiteHeader
        sesion={false}
        mostrarCarrito={false}
        mostrarCatalogo={false}
        mostrarInicio={true}
      />

      {/* Main Card */}
      <main className="max-w-md mx-auto w-full py-8 md:py-12">
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 md:p-8 shadow-sm">
          
          {/* Encabezado de la Tarjeta */}
          <div className="mb-6 text-center">
            <div className="w-12 h-12 mx-auto mb-3.5 rounded-2xl bg-gold-50 border border-gold-200 flex items-center justify-center text-gold-600 shadow-xs">
              <KeyRound className="w-6 h-6 text-gold-600" />
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
              Recuperar contraseña
            </h1>
            <p className="text-neutral-500 text-xs md:text-sm mt-1.5 leading-relaxed">
              Ingresa el correo electrónico asociado a tu cuenta y te enviaremos un enlace para restablecer tu contraseña.
            </p>
          </div>

          {/* Mensaje de Error si existiera falla de red o validación */}
          {errorMessage && (
            <div 
              id="error-message-forgot" 
              className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-red-700 text-xs md:text-sm animate-in fade-in duration-200"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
              <div>
                <p className="font-bold text-red-800">Aviso</p>
                <p className="mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {isSent ? (
            /* Estado: Email Enviado (Protección anti-enumeración de usuarios) */
            <div 
              id="success-forgot-password" 
              className="space-y-6 text-center animate-in fade-in duration-300"
            >
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-left space-y-2">
                <div className="flex items-center gap-2 font-bold text-emerald-950 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Solicitud enviada</span>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Si existe una cuenta asociada a este correo, recibirás un enlace para restablecer tu contraseña.
                </p>
              </div>

              <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 text-xs text-neutral-600 text-left space-y-1">
                <p className="font-semibold text-neutral-800 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-gold-600" /> ¿No recibiste el correo?
                </p>
                <p>
                  Revisá tu carpeta de correo no deseado o spam. El enlace tiene una validez limitada.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsSent(false);
                    setEmail('');
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Probar con otro correo
                </button>

                <Link
                  href="/login"
                  id="btn-volver-login"
                  className="w-full py-3 px-4 rounded-xl bg-gold-500 hover:bg-gold-400 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-gold-500/20 transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Volver al inicio de sesión</span>
                </Link>
              </div>
            </div>
          ) : (
            /* Formulario para ingresar correo */
            <form onSubmit={handleSubmit} className="space-y-4" id="form-forgot-password">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5" htmlFor="email">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="salon@ejemplo.com"
                    autoComplete="email"
                    className="w-full bg-white border border-neutral-300 rounded-xl pl-10 pr-3 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
                  />
                </div>
              </div>

              <button
                id="btn-enviar-enlace-recuperacion"
                type="submit"
                disabled={isPending}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-gold-500 hover:bg-gold-400 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-gold-500/20 cursor-pointer"
              >
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Enviando enlace...
                  </span>
                ) : (
                  <>
                    <span>Enviar enlace</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="pt-3 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-800 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Volver al inicio de sesión</span>
                </Link>
              </div>
            </form>
          )}

          <div className="mt-6 pt-6 border-t border-neutral-200 text-center">
            <p className="text-xs text-neutral-500">
              ¿Aún no diste de alta tu peluquería?{' '}
              <Link href="/registro" className="text-gold-600 font-semibold hover:underline">
                Registrar salón
              </Link>
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
