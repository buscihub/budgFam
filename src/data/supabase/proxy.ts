import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '../database.types';
import { getSupabaseEnv } from '../env';

// Refreshes the session cookies on every request and reports whether the
// request carries a valid session. This is an OPTIMISTIC check (the token is
// verified locally, no Auth server call): it only decides redirects. The real
// authorization check is `getCurrentUser()` in ../auth.ts (ADR-021).
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, anonKey } = getSupabaseEnv();

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  return { response, isAuthenticated: Boolean(data?.claims) };
}
