import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '../database.types';
import { getSupabaseEnv } from '../env';

// Supabase client for Server Components, Server Actions and Route Handlers,
// bound to the current user's session cookies (so RLS applies as that user).
export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseEnv();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component, where cookies are read-only. Safe
          // to ignore: the proxy refreshes the session on every request.
        }
      },
    },
  });
}
