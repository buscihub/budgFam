import 'server-only';
import { requireMembership } from './households';
import { createClient } from './supabase/server';
import type { CreateAccountInput } from '@/domain/accounts/schemas';

export type Account = {
  id: string;
  name: string;
  kind: 'bank' | 'card' | 'cash';
  visibility: 'private' | 'shared';
  bankFormat: string | null;
  ownerId: string;
};

export type AccountsOverview = {
  mine: Account[];
  // Shared accounts of other members, read-only, labelled with the owner (ADR-025).
  sharedByOthers: (Account & { ownerName: string })[];
};

function toAccount(row: {
  id: string;
  name: string;
  kind: string;
  visibility: string;
  bank_format: string | null;
  owner_id: string;
}): Account {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind as Account['kind'],
    visibility: row.visibility as Account['visibility'],
    bankFormat: row.bank_format,
    ownerId: row.owner_id,
  };
}

// RLS already returns only the caller's accounts plus the shared ones.
export async function listAccounts(): Promise<AccountsOverview> {
  const { user, householdId } = await requireMembership();
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from('accounts')
    .select('id, name, kind, visibility, bank_format, owner_id')
    .order('name');
  const accounts = (rows ?? []).map(toAccount);

  const { data: members } = await supabase
    .from('members')
    .select('user_id, display_name')
    .eq('household_id', householdId);
  const names = new Map((members ?? []).map((m) => [m.user_id, m.display_name]));

  return {
    mine: accounts.filter((a) => a.ownerId === user.id),
    sharedByOthers: accounts
      .filter((a) => a.ownerId !== user.id)
      .map((a) => ({ ...a, ownerName: names.get(a.ownerId) ?? 'un familiare' })),
  };
}

export type CreateAccountResult =
  { ok: true; id: string } | { ok: false; code: 'duplicate' | 'failed' };

const UNIQUE_VIOLATION = '23505';

export async function createAccount(input: CreateAccountInput): Promise<CreateAccountResult> {
  const { user, householdId } = await requireMembership();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('accounts')
    .insert({
      household_id: householdId,
      owner_id: user.id, // always the caller, never taken from the client
      name: input.name,
      kind: input.kind,
      visibility: input.visibility,
      bank_format: input.bankFormat,
    })
    .select('id')
    .single();
  if (error || !data) {
    return { ok: false, code: error?.code === UNIQUE_VIOLATION ? 'duplicate' : 'failed' };
  }
  return { ok: true, id: data.id };
}

export type DeletionImpact = {
  account: Account;
  // What the confirmation page tells the user (ADR-033). Counts are what the
  // caller can see, which is exactly what the delete can touch.
  privateTransactions: number;
  sharedTransactions: number;
};

export async function getDeletionImpact(accountId: string): Promise<DeletionImpact | null> {
  await requireMembership();
  const supabase = await createClient();
  const { data } = await supabase
    .from('accounts')
    .select('id, name, kind, visibility, bank_format, owner_id')
    .eq('id', accountId)
    .maybeSingle();
  if (!data) return null;

  const count = async (visibility: 'private' | 'shared') => {
    const { count: n } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', accountId)
      .eq('visibility', visibility);
    return n ?? 0;
  };
  return {
    account: toAccount(data),
    privateTransactions: await count('private'),
    sharedTransactions: await count('shared'),
  };
}

// Private transactions are deleted by a trigger, shared ones are kept without
// an account (ADR-033). RLS decides who may delete: a delete that touches no
// row (not allowed, or already gone) is reported as not_found.
export async function deleteAccount(
  accountId: string,
): Promise<{ ok: true } | { ok: false; code: 'not_found' | 'failed' }> {
  await requireMembership();
  const supabase = await createClient();
  const { data, error } = await supabase.from('accounts').delete().eq('id', accountId).select('id');
  if (error) return { ok: false, code: 'failed' };
  return data.length === 0 ? { ok: false, code: 'not_found' } : { ok: true };
}
