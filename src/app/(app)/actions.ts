'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { signOut } from '@/data/auth';
import { createInviteSchema } from '@/domain/household/schemas';
import { createInvite } from '@/data/invites';

export async function logoutAction() {
  await signOut();
  redirect('/login');
}

export type InviteFormState = { error?: string; link?: string };

export async function createInviteAction(
  _prev: InviteFormState,
  formData: FormData,
): Promise<InviteFormState> {
  const parsed = createInviteSchema.safeParse({ role: formData.get('role') });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const result = await createInvite(parsed.data.role);
  if (!result.ok) return { error: 'Non è stato possibile creare l’invito. Riprova.' };

  // A protocol-relative URL ("//host/…") isn't reliably clickable when pasted
  // into a chat app, so build an absolute one. `x-forwarded-proto` is set by
  // Vercel/any reverse proxy; falling back to http only matches local dev,
  // where the host is always localhost/127.0.0.1.
  const requestHeaders = await headers();
  const host = requestHeaders.get('host') ?? 'localhost';
  const protocol = requestHeaders.get('x-forwarded-proto') ?? 'http';
  return { link: `${protocol}://${host}/invite/${result.code}` };
}
