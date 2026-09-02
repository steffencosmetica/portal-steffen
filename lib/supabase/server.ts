import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function getCleanSupabaseUrl(): string {
  let raw = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
  raw = raw.replace(/^['"]|['"]$/g, '').trim();

  if (!raw) {
    return 'https://placeholder-project.supabase.co';
  }

  // Si pegaron una cadena de postgres por error, extraer el ID del proyecto
  if (raw.startsWith('postgres://') || raw.startsWith('postgresql://')) {
    const match = raw.match(/postgres\.([a-zA-Z0-9_-]+):/);
    if (match && match[1]) {
      return `https://${match[1]}.supabase.co`;
    }
  }

  // Si no tiene https:// ni http://
  if (!raw.startsWith('http://') && !raw.startsWith('https://')) {
    raw = `https://${raw}`;
  }

  try {
    const parsed = new URL(raw);
    // Extraer estrictamente el origen (protocol + host), eliminando rutas extra como /rest/v1, /auth/v1 o barras
    return parsed.origin;
  } catch {
    return 'https://placeholder-project.supabase.co';
  }
}

export function getCleanSupabaseKey(key?: string, fallback = 'placeholder-anon-key'): string {
  let clean = (key || '').trim();
  clean = clean.replace(/^['"]|['"]$/g, '').trim();
  return clean || fallback;
}

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  const supabaseUrl = getCleanSupabaseUrl();
  const supabaseAnonKey = getCleanSupabaseKey(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  );

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: Parameters<typeof cookieStore.set>[2] }>) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Ignored in Server Components
        }
      },
    },
  });
}

export function createAdminSupabaseClient() {
  const supabaseUrl = getCleanSupabaseUrl();
  const serviceRoleKey = getCleanSupabaseKey(
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY
  );

  return createServerClient(supabaseUrl, serviceRoleKey, {
    cookies: {
      getAll: () => [],
      setAll: () => {},
    },
  });
}

