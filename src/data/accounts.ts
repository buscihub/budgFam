import 'server-only';
import { requireMembership } from './households';
import { createClient } from './supabase/server';
import type { CreateAccountInput, UpdateAccountInput } from '@/domain/accounts/schemas';
import type { ChangeVisibilityInput } from '@/domain/accounts/visibility';

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

export type AccountDetail = Account & {
  // Whether the caller may change it: only the owner (ADR-025); the shared
  // accounts of others are read-only here even for an admin.
  canEdit: boolean;
  ownerName: string | null;
};

// One account the caller can see, or null (RLS hides other people's private
// accounts, so an invented or foreign id is simply "not found").
export async function getAccount(accountId: string): Promise<AccountDetail | null> {
  const { user, householdId } = await requireMembership();
  const supabase = await createClient();
  const { data } = await supabase
    .from('accounts')
    .select('id, name, kind, visibility, bank_format, owner_id')
    .eq('id', accountId)
    .maybeSingle();
  if (!data) return null;
  const account = toAccount(data);
  const { data: member } = await supabase
    .from('members')
    .select('display_name')
    .eq('household_id', householdId)
    .eq('user_id', account.ownerId)
    .maybeSingle();
  return {
    ...account,
    canEdit: account.ownerId === user.id,
    ownerName: account.ownerId === user.id ? null : (member?.display_name ?? 'un familiare'),
  };
}

export type UpdateAccountResult =
  { ok: true } | { ok: false; code: 'not_found' | 'duplicate' | 'cash_has_no_format' | 'failed' };

export async function updateAccount(input: UpdateAccountInput): Promise<UpdateAccountResult> {
  const { user } = await requireMembership();
  const supabase = await createClient();
  const { data: current } = await supabase
    .from('accounts')
    .select('kind')
    .eq('id', input.id)
    .eq('owner_id', user.id)
    .maybeSingle();
  if (!current) return { ok: false, code: 'not_found' };
  if (current.kind === 'cash' && input.bankFormat !== null) {
    return { ok: false, code: 'cash_has_no_format' };
  }
  const { error } = await supabase
    .from('accounts')
    .update({ name: input.name, bank_format: input.bankFormat })
    .eq('id', input.id)
    .eq('owner_id', user.id);
  if (error) return { ok: false, code: error.code === UNIQUE_VIOLATION ? 'duplicate' : 'failed' };
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Changing who sees an account (ADR-015)
// ---------------------------------------------------------------------------

export type VisibilityPreview = {
  // Movements that would change: the caller's own, in this account, not set by
  // hand (visibility_overridden = false, ADR-015) and not already at the target.
  count: number;
  // The other members of the family: who gains or loses the view.
  others: number;
};

type OwnAccount = { id: string; visibility: 'private' | 'shared' };

async function getOwnAccountForVisibility(accountId: string): Promise<OwnAccount | null> {
  const { user } = await requireMembership();
  const supabase = await createClient();
  const { data } = await supabase
    .from('accounts')
    .select('id, visibility')
    .eq('id', accountId)
    .eq('owner_id', user.id)
    .maybeSingle();
  return data ? { id: data.id, visibility: data.visibility as OwnAccount['visibility'] } : null;
}

// "Solo da ora" changes no existing movement; "da una data" those booked on or
// after it; "tutto lo storico" all of them.
function affectedBy(input: ChangeVisibilityInput) {
  return input.scope === 'now'
    ? null
    : { fromDate: input.scope === 'from_date' ? input.fromDate : null };
}

export async function previewVisibilityChange(
  input: ChangeVisibilityInput,
): Promise<VisibilityPreview | null> {
  const { user, householdId } = await requireMembership();
  const account = await getOwnAccountForVisibility(input.id);
  if (!account) return null;
  const supabase = await createClient();

  const { count: members } = await supabase
    .from('members')
    .select('user_id', { count: 'exact', head: true })
    .eq('household_id', householdId);
  const others = Math.max((members ?? 1) - 1, 0);

  const affected = affectedBy(input);
  if (!affected) return { count: 0, others };
  let query = supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('account_id', account.id)
    .eq('owner_id', user.id)
    .eq('visibility_overridden', false)
    .neq('visibility', input.visibility);
  if (affected.fromDate) query = query.gte('booked_on', affected.fromDate);
  const { count, error } = await query;
  if (error) return null;
  return { count: count ?? 0, others };
}

export type ChangeVisibilityResult =
  { ok: true; changed: number } | { ok: false; code: 'not_found' | 'failed' };

const ACCOUNT_NOT_FOUND = 'P0002';

// One call to the database function change_account_visibility: the movements
// brought along and the account itself change in a single transaction, so a
// failure leaves everything as it was. The function runs as the caller (RLS
// and column grants apply) and also leaves alone movements whose visibility
// was chosen by hand (ADR-015).
export async function changeAccountVisibility(
  input: ChangeVisibilityInput,
): Promise<ChangeVisibilityResult> {
  await requireMembership();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('change_account_visibility', {
    p_account_id: input.id,
    p_visibility: input.visibility,
    p_apply_to_existing: input.scope !== 'now',
    ...(input.scope === 'from_date' && input.fromDate ? { p_from_date: input.fromDate } : {}),
  });
  if (error) return { ok: false, code: error.code === ACCOUNT_NOT_FOUND ? 'not_found' : 'failed' };
  return { ok: true, changed: data };
}
