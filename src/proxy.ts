import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/data/supabase/proxy';

const AUTH_PAGES = ['/login', '/signup'];

// Optimistic filter (ADR-021): keeps logged-out visitors on the auth pages and
// logged-in users off them. Pages and Server Actions still check the user
// themselves with `requireUser()`.
export async function proxy(request: NextRequest) {
  const { response, isAuthenticated } = await updateSession(request);
  const isAuthPage = AUTH_PAGES.includes(request.nextUrl.pathname);

  let destination: string | null = null;
  if (!isAuthenticated && !isAuthPage) destination = '/login';
  if (isAuthenticated && isAuthPage) destination = '/';
  if (!destination) return response;

  const redirect = NextResponse.redirect(new URL(destination, request.url));
  // Keep the refreshed session cookies on the redirect too.
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export const config = {
  // Everything except Next.js internals and static assets.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
