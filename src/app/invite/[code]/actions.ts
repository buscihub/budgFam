'use server';

import { redirect } from 'next/navigation';
import { acceptInviteSchema } from '@/domain/household/schemas';
import { acceptInvite } from '@/data/invites';
import { requireUser } from '@/data/auth';

export type AcceptInviteFormState = { error?: string; memberName?: string };

const ERROR_MESSAGES: Record<string, string> = {
  not_found: 'Questo link di invito non è valido.',
  used: 'Questo link di invito è già stato usato.',
  expired: 'Questo link di invito è scaduto: chiedine uno nuovo.',
  already_member: 'Fai già parte di una famiglia.',
  failed: 'Non è stato possibile accettare l’invito. Riprova.',
};

export async function acceptInviteAction(
  _prev: AcceptInviteFormState,
  formData: FormData,
): Promise<AcceptInviteFormState> {
  await requireUser();

  const code = String(formData.get('code') ?? '');
  const memberName = String(formData.get('memberName') ?? '');
  const parsed = acceptInviteSchema.safeParse({ memberName });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message, memberName };

  const result = await acceptInvite(code, parsed.data.memberName);
  if (!result.ok) return { error: ERROR_MESSAGES[result.code], memberName };

  redirect('/');
}
