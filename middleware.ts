import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getCleanSupabaseUrl, getCleanSupabaseKey } from '@/lib/supabase/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = getCleanSupabaseUrl();
  const supabaseAnonKey = getCleanSupabaseKey(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  );

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Obtener usuario autenticado de forma robusta a través del SDK de Supabase SSR
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isProtectedAppRoute = pathname.startsWith('/perfil');
  const isAdminRoute = pathname.startsWith('/admin');

  const userRol = (user?.app_metadata?.rol || user?.user_metadata?.rol) as string | undefined;
  const estadoCliente = (user?.app_metadata?.estadoCliente || user?.user_metadata?.estadoCliente) as string | undefined;

  // 0. Si el usuario está autenticado pero su cuenta está BLOQUEADA
  if (user && estadoCliente === 'BLOQUEADO') {
    if (pathname !== '/cuenta-bloqueada') {
      const url = request.nextUrl.clone();
      url.pathname = '/cuenta-bloqueada';
      return NextResponse.redirect(url);
    }
    return response;
  }

  // 1. Si no está autenticado y quiere entrar a una ruta protegida (/perfil o /admin), redirigir al login
  if (!user && (isProtectedAppRoute || isAdminRoute)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // 2. Si ya está autenticado e intenta ir a login o registro con sesión activa
  if (user && (pathname === '/login' || pathname === '/registro')) {
    // Si viene con redirect param, respetar el redirect
    const redirectParam = request.nextUrl.searchParams.get('redirect');
    if (redirectParam && redirectParam.startsWith('/')) {
      const url = request.nextUrl.clone();
      url.pathname = redirectParam;
      url.searchParams.delete('redirect');
      return NextResponse.redirect(url);
    }

    const url = request.nextUrl.clone();
    url.pathname = userRol === 'ADMIN' ? '/admin' : '/';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Interceptar todas las rutas excepto archivos estáticos o imágenes
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};


