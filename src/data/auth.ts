import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from './supabase/server';

// Data Access Layer for authentication. Everything the UI knows about the
// signed-in user comes from here, and only the fields it needs (DTO), never
// the raw Supabase user object.

export type CurrentUser = { id: string; email: string };

export type AuthResult =
  { ok: true } | { ok: false; code: 'invalid_credentials' | 'signup_failed' };

// `getUser()` asks the Auth server to validate the token, so a deleted user or
// a revoked session is rejected right away. Memoised per request.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? '' };
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  // One code for "unknown email" and "wrong password": we never reveal which.
  return error ? { ok: false, code: 'invalid_credentials' } : { ok: true };
}

export async function signUp(email: string, password: string): Promise<AuthResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({ email, password });
  return error ? { ok: false, code: 'signup_failed' } : { ok: true };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
