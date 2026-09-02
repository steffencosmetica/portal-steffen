import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { type EmailOtpType } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const token_hash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type') as EmailOtpType | null;
  const rawNext = requestUrl.searchParams.get('next');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  // Determinar destino por defecto según el tipo de operación
  let defaultNext = '/';
  if (type === 'recovery' || requestUrl.pathname.includes('reset-password')) {
    defaultNext = '/reset-password';
  } else if (type === 'signup' || type === 'email' || type === 'email_change') {
    defaultNext = '/cuenta-confirmada';
  }

  const next = rawNext || defaultNext;

  // Si Supabase devuelve un error en el enlace (por ejemplo enlace expirado)
  if (error) {
    const errorTarget = next.startsWith('/reset-password')
      ? '/reset-password'
      : next.startsWith('/cuenta-confirmada')
      ? '/cuenta-confirmada'
      : '/login';
    const redirectUrl = new URL(errorTarget, requestUrl.origin);
    redirectUrl.searchParams.set('error', error);
    if (errorDescription) {
      redirectUrl.searchParams.set('error_description', errorDescription);
    }
    return NextResponse.redirect(redirectUrl);
  }

  const supabase = await createServerSupabaseClient();

  // 1. Manejar flujo de código PKCE (?code=...)
  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!exchangeError) {
      const forwardUrl = new URL(next, requestUrl.origin);
      return NextResponse.redirect(forwardUrl);
    } else {
      console.error('Error al intercambiar código por sesión en Supabase:', exchangeError);
      const errorTarget = next.startsWith('/reset-password') ? '/reset-password' : '/login';
      const errorUrl = new URL(errorTarget, requestUrl.origin);
      errorUrl.searchParams.set('error', 'invalid_token');
      errorUrl.searchParams.set('error_description', exchangeError.message);
      return NextResponse.redirect(errorUrl);
    }
  }

  // 2. Manejar flujo de token_hash (?token_hash=...&type=signup|recovery|email)
  if (token_hash && type) {
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash,
      type,
    });

    if (!verifyError) {
      const forwardUrl = new URL(next, requestUrl.origin);
      return NextResponse.redirect(forwardUrl);
    } else {
      console.error('Error al verificar OTP token_hash en Supabase:', verifyError);
      const errorTarget = type === 'recovery' ? '/reset-password' : '/cuenta-confirmada';
      const errorUrl = new URL(errorTarget, requestUrl.origin);
      errorUrl.searchParams.set('error', 'invalid_token');
      errorUrl.searchParams.set('error_description', verifyError.message);
      return NextResponse.redirect(errorUrl);
    }
  }

  // Si no hay código ni token_hash pero sí ruta
  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
