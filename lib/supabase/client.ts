import { createBrowserClient } from '@supabase/ssr';

function getCleanClientUrl(): string {
  let raw = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  raw = raw.replace(/^['"]|['"]$/g, '').trim();

  if (!raw) {
    return 'https://placeholder-project.supabase.co';
  }

  if (raw.startsWith('postgres://') || raw.startsWith('postgresql://')) {
    const match = raw.match(/postgres\.([a-zA-Z0-9_-]+):/);
    if (match && match[1]) {
      return `https://${match[1]}.supabase.co`;
    }
  }

  if (!raw.startsWith('http://') && !raw.startsWith('https://')) {
    raw = `https://${raw}`;
  }

  try {
    const parsed = new URL(raw);
    return parsed.origin;
  } catch {
    return 'https://placeholder-project.supabase.co';
  }
}

function getCleanClientKey(): string {
  let raw = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
  raw = raw.replace(/^['"]|['"]$/g, '').trim();
  return raw || 'placeholder-anon-key';
}

export function createClient() {
  const supabaseUrl = getCleanClientUrl();
  const supabaseAnonKey = getCleanClientKey();

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

