import 'server-only';
import { requireMembership } from './households';
import { requireUser } from './auth';
import { createClient } from './supabase/server';

export type CreateInviteResult = { ok: true; code: string } | { ok: false };

export async function createInvite(role: 'admin' | 'member'): Promise<CreateInviteResult> {
  const { user, householdId, role: callerRole } = await requireMembership();
  if (callerRole !== 'admin') return { ok: false };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('invites')
    .insert({ household_id: householdId, role, created_by: user.id })
    .select('code')
    .single();
  if (error || !data) return { ok: false };
  return { ok: true, code: data.code };
}

export type AcceptInviteResult =
  | { ok: true }
  | { ok: false; code: 'not_found' | 'used' | 'expired' | 'already_member' | 'failed' };

type AcceptInviteFailureCode = Extract<AcceptInviteResult, { ok: false }>['code'];

const ERROR_CODES: Record<string, AcceptInviteFailureCode> = {
  invite_not_found: 'not_found',
  invite_already_used: 'used',
  invite_expired: 'expired',
  already_member: 'already_member',
};

export async function acceptInvite(
  inviteCode: string,
  memberName: string,
): Promise<AcceptInviteResult> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc('accept_invite', {
    invite_code: inviteCode,
    member_name: memberName,
  });
  if (!error) return { ok: true };
  return { ok: false, code: ERROR_CODES[error.message] ?? 'failed' };
}
