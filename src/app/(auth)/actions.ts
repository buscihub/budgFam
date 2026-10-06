'use server';

import { redirect } from 'next/navigation';
import { loginSchema, signupSchema } from '@/domain/auth/schemas';
import { signIn, signUp } from '@/data/auth';

export type AuthFormState = { error?: string; email?: string };

const field = (formData: FormData, name: string) => String(formData.get(name) ?? '');

export async function loginAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = field(formData, 'email');
  const parsed = loginSchema.safeParse({ email, password: field(formData, 'password') });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message, email };

  const result = await signIn(parsed.data.email, parsed.data.password);
  if (!result.ok) return { error: 'Email o password non corretti.', email };

  redirect('/');
}

export async function signupAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = field(formData, 'email');
  const parsed = signupSchema.safeParse({ email, password: field(formData, 'password') });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message, email };

  const result = await signUp(parsed.data.email, parsed.data.password);
  // Generic on purpose: we don't reveal whether the email is already registered.
  if (!result.ok) return { error: 'Non è stato possibile creare l’account. Riprova.', email };

  redirect('/');
}
