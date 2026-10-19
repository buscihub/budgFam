import 'server-only';
import { requireMembership } from './households';
import { createClient } from './supabase/server';
import {
  computeMonthlySummary,
  type MonthlySummary,
  type SummaryCategory,
  type SummaryTransaction,
} from '@/domain/budget/monthly-summary';
import { monthRange, parseMonthParam, type MonthKey } from '@/domain/transactions/months';
import type {
  CreateManualTransactionInput,
  TransactionFilters,
  UpdateTransactionInput,
} from '@/domain/transactions/schemas';
import type { TablesUpdate } from './database.types';

// `new Date()` + `getFullYear()`/`getMonth()` read the server's local clock,
// which on Vercel is UTC, not Europe/Rome (CLAUDE.md non-negotiable rule 11).
// Near midnight that can be the wrong day and, right at month boundaries, the
// wrong month. Intl.DateTimeFormat renders the same instant in Rome's wall
// clock instead.
export function getCurrentMonthRome(): MonthKey {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());
  const year = Number(parts.find((p) => p.type === 'year')?.value);
  const month = Number(parts.find((p) => p.type === 'month')?.value);
  return { year, month };
}

// Monthly summary for the current household (DESIGN_DOC §13.1 task 1.6).
// Defaults to the current month in Europe/Rome.
//
// Only `visibility = 'shared'` transactions are read: RLS would also let the
// caller's own private rows through (CLAUDE.md non-negotiable rule 8 — RLS
// handles household/privacy isolation, not "which rows this view wants"), but
// §13.1's "riepilogo mensile" here is the single, non-split summary task 1.6
// asks for, not yet the Famiglia/Personale split of ADR-018 (that's task 3.2b
// — out of scope for now per CLAUDE.md "non aggiungere funzioni fuori
// scope"). Restricting to shared rows is the closest match to "the family's
// month" without building that split early.
export async function getMonthlySummary(
  month: MonthKey = getCurrentMonthRome(),
): Promise<MonthlySummary> {
  const { householdId } = await requireMembership();
  const supabase = await createClient();
  const { from, to } = monthRange(month);

  const [{ data: transactionRows, error: txError }, { data: categoryRows, error: catError }] =
    await Promise.all([
      supabase
        .from('transactions')
        .select('amount_cents, category_id')
        .eq('household_id', householdId)
        .eq('visibility', 'shared')
        .gte('booked_on', from)
        .lt('booked_on', to),
      supabase.from('categories').select('id, name, kind').eq('household_id', householdId),
    ]);

  if (txError) throw new Error(`failed to load transactions: ${txError.message}`);
  if (catError) throw new Error(`failed to load categories: ${catError.message}`);

  const transactions: SummaryTransaction[] = (transactionRows ?? []).map((row) => ({
    amountCents: row.amount_cents,
    categoryId: row.category_id,
  }));
  // `kind` is `text` with a CHECK constraint in Postgres, not a Postgres enum,
  // so the generated type is the untyped `string` seen in database.types.ts;
  // the CHECK guarantees it is one of these four values at the DB boundary.
  const categories: SummaryCategory[] = (categoryRows ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    kind: row.kind as SummaryCategory['kind'],
  }));

  return computeMonthlySummary(transactions, categories);
}

// ---------------------------------------------------------------------------
// Movimenti list, detail and manual entry (DESIGN_DOC §13.1 task 1.5b)
// ---------------------------------------------------------------------------

export type TransactionListItem = {
  id: string;
  bookedOn: string;
  amountCents: number;
  description: string;
  categoryName: string | null;
  // null when the account is hidden from the caller (a shared movement on
  // somebody else's private account, ADR-015) or has been deleted (ADR-033).
  accountName: string | null;
  visibility: 'private' | 'shared';
  needsReview: boolean;
  // Whose movement it is: the list shows a person chip on other members' shared
  // movements. Null name = the member left the family (ADR-029).
  isMine: boolean;
  ownerName: string | null;
};

export type TransactionList = {
  month: MonthKey;
  items: TransactionListItem[];
  // Movements waiting for review among those the caller can see, ignoring the
  // current filters: it feeds the banner at the top (ADR-026).
  toReviewCount: number;
  // When this month shows nothing: the most recent earlier month that has
  // movements under the same filters, so the empty page can point to it.
  latestBefore: MonthKey | null;
};

export async function listTransactions(filters: TransactionFilters): Promise<TransactionList> {
  const { user, householdId } = await requireMembership();
  const supabase = await createClient();

  // One month at a time (§5.3): the list is bounded by the calendar, so no
  // row cap or pagination is needed.
  const month = filters.month ?? getCurrentMonthRome();
  const { from, to } = monthRange(month);

  let query = supabase
    .from('transactions')
    .select(
      'id, booked_on, amount_cents, description, visibility, needs_review, owner_id, categories(name), accounts(name)',
    )
    .eq('household_id', householdId)
    .gte('booked_on', from)
    .lt('booked_on', to)
    .order('booked_on', { ascending: false })
    .order('created_at', { ascending: false });
  if (filters.accountId) query = query.eq('account_id', filters.accountId);
  if (filters.categoryId) query = query.eq('category_id', filters.categoryId);
  if (filters.onlyToReview) query = query.eq('needs_review', true);

  const [{ data, error }, { count }, { data: members }] = await Promise.all([
    query,
    supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('household_id', householdId)
      .eq('needs_review', true),
    supabase.from('members').select('user_id, display_name').eq('household_id', householdId),
  ]);
  if (error) throw new Error(`failed to load transactions: ${error.message}`);
  const names = new Map((members ?? []).map((m) => [m.user_id, m.display_name]));

  // Only worth a query when there is nothing to show: a list that opens on an
  // empty current month (all movements are from earlier) is the usual case.
  let latestBefore: MonthKey | null = null;
  if ((data ?? []).length === 0) {
    let earlier = supabase
      .from('transactions')
      .select('booked_on')
      .eq('household_id', householdId)
      .lt('booked_on', from)
      .order('booked_on', { ascending: false })
      .limit(1);
    if (filters.accountId) earlier = earlier.eq('account_id', filters.accountId);
    if (filters.categoryId) earlier = earlier.eq('category_id', filters.categoryId);
    if (filters.onlyToReview) earlier = earlier.eq('needs_review', true);
    const { data: last } = await earlier;
    latestBefore = parseMonthParam(last?.[0]?.booked_on.slice(0, 7));
  }

  return {
    month,
    items: (data ?? []).map((row) => ({
      id: row.id,
      bookedOn: row.booked_on,
      amountCents: row.amount_cents,
      description: row.description,
      categoryName: row.categories?.name ?? null,
      accountName: row.accounts?.name ?? null,
      visibility: row.visibility as TransactionListItem['visibility'],
      needsReview: row.needs_review,
      isMine: row.owner_id === user.id,
      ownerName: row.owner_id ? (names.get(row.owner_id) ?? null) : null,
    })),
    toReviewCount: count ?? 0,
    latestBefore,
  };
}

export type TransactionDetail = TransactionListItem & {
  rawDescription: string;
  note: string | null;
  categoryId: string | null;
  categorySource: 'rule' | 'ai' | 'user' | null;
  // What the account would give this movement (ADR-015); null when the account
  // is not visible to the caller or was deleted (ADR-033): then "follow the
  // account" cannot be offered.
  accountVisibility: 'private' | 'shared' | null;
  visibilityOverridden: boolean;
  // Only the owner may change the visibility or delete (admins can delete
  // shared ones too, but visibility stays with the owner — RLS decides, the UI
  // just doesn't offer what would be refused).
  isOwner: boolean;
  canDelete: boolean;
};

export async function getTransaction(id: string): Promise<TransactionDetail | null> {
  const { user, role } = await requireMembership();
  const supabase = await createClient();
  const { data } = await supabase
    .from('transactions')
    .select(
      'id, booked_on, amount_cents, description, raw_description, note, visibility, visibility_overridden, needs_review, category_id, category_source, owner_id, categories(name), accounts(name, visibility)',
    )
    .eq('id', id)
    .maybeSingle();
  if (!data) return null;

  const isOwner = data.owner_id === user.id;
  return {
    id: data.id,
    bookedOn: data.booked_on,
    amountCents: data.amount_cents,
    description: data.description,
    rawDescription: data.raw_description,
    note: data.note,
    categoryId: data.category_id,
    categoryName: data.categories?.name ?? null,
    categorySource: data.category_source as TransactionDetail['categorySource'],
    accountName: data.accounts?.name ?? null,
    accountVisibility: (data.accounts?.visibility as 'private' | 'shared' | undefined) ?? null,
    visibilityOverridden: data.visibility_overridden,
    visibility: data.visibility as TransactionListItem['visibility'],
    needsReview: data.needs_review,
    isMine: isOwner,
    ownerName: null, // the detail never shows the person chip
    isOwner,
    // Same rule as the transactions_delete policy.
    canDelete: isOwner || role === 'admin',
  };
}

export type CreateTransactionResult =
  | { ok: true; id: string }
  | { ok: false; code: 'account_not_found' | 'category_not_found' | 'failed' };

// A manual entry has no import (import_id null) and no import_hash: the hash
// is for rows coming from a file (§8.3), a typed-in movement is never a
// "duplicate" of anything.
export async function createManualTransaction(
  input: CreateManualTransactionInput,
): Promise<CreateTransactionResult> {
  const { user, householdId } = await requireMembership();
  const supabase = await createClient();

  // The account must be one of the caller's own: RLS refuses inserts on other
  // people's accounts anyway, but reading it first gives a clear answer and
  // the visibility the movement inherits (ADR-015).
  const { data: account } = await supabase
    .from('accounts')
    .select('visibility')
    .eq('id', input.accountId)
    .eq('owner_id', user.id)
    .maybeSingle();
  if (!account) return { ok: false, code: 'account_not_found' };

  if (input.categoryId) {
    const { data: category } = await supabase
      .from('categories')
      .select('id')
      .eq('id', input.categoryId)
      .eq('household_id', householdId)
      .maybeSingle();
    if (!category) return { ok: false, code: 'category_not_found' };
  }

  const accountVisibility = account.visibility as 'private' | 'shared';
  const visibility = input.visibility ?? accountVisibility;
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      household_id: householdId,
      account_id: input.accountId,
      owner_id: user.id, // always the caller, never taken from the client
      booked_on: input.bookedOn,
      amount_cents: input.amountCents,
      description: input.description,
      raw_description: input.rawDescription,
      category_id: input.categoryId,
      category_source: input.categoryId ? 'user' : null,
      visibility,
      visibility_overridden: visibility !== accountVisibility,
    })
    .select('id')
    .single();
  if (error || !data) return { ok: false, code: 'failed' };
  return { ok: true, id: data.id };
}

export type UpdateTransactionResult =
  | { ok: true }
  | { ok: false; code: 'not_found' | 'category_not_found' | 'account_unavailable' | 'failed' };

export async function updateTransaction(
  input: UpdateTransactionInput,
): Promise<UpdateTransactionResult> {
  const { householdId } = await requireMembership();
  const supabase = await createClient();

  const { data: current } = await supabase
    .from('transactions')
    .select('category_id, visibility, accounts(visibility)')
    .eq('id', input.id)
    .maybeSingle();
  if (!current) return { ok: false, code: 'not_found' };

  const changes: TablesUpdate<'transactions'> = { note: input.note };

  if (input.categoryId !== current.category_id) {
    if (input.categoryId) {
      const { data: category } = await supabase
        .from('categories')
        .select('id')
        .eq('id', input.categoryId)
        .eq('household_id', householdId)
        .maybeSingle();
      if (!category) return { ok: false, code: 'category_not_found' };
    }
    changes.category_id = input.categoryId;
    // A person's choice always wins over the rule/AI one, and clears the
    // "to review" flag: it has just been reviewed.
    changes.category_source = input.categoryId ? 'user' : null;
    if (input.categoryId) {
      changes.ai_confidence = null;
      changes.needs_review = false;
    }
  }

  if (input.followAccount) {
    // Back to what the account says, and the manual choice is forgotten (ADR-015).
    if (!current.accounts) return { ok: false, code: 'account_unavailable' };
    changes.visibility = current.accounts.visibility;
    changes.visibility_overridden = false;
  } else if (input.visibility !== undefined && input.visibility !== current.visibility) {
    // Only the owner's form sends a visibility (ADR-015); for anybody else RLS
    // would refuse making a shared movement private, so it is simply left alone.
    changes.visibility = input.visibility;
    changes.visibility_overridden = true; // chosen by hand: the account never overrides it again
  }

  const { data, error } = await supabase
    .from('transactions')
    .update(changes)
    .eq('id', input.id)
    .select('id');
  if (error) return { ok: false, code: 'failed' };
  return data.length === 0 ? { ok: false, code: 'not_found' } : { ok: true };
}

// RLS decides who may delete (owner or admin): a delete that touches no row is
// reported as not_found, the same as for accounts.
export async function deleteTransaction(
  id: string,
): Promise<{ ok: true } | { ok: false; code: 'not_found' | 'failed' }> {
  await requireMembership();
  const supabase = await createClient();
  const { data, error } = await supabase.from('transactions').delete().eq('id', id).select('id');
  if (error) return { ok: false, code: 'failed' };
  return data.length === 0 ? { ok: false, code: 'not_found' } : { ok: true };
}
