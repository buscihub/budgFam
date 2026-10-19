import 'server-only';
import { requireMembership } from './households';
import { createClient } from './supabase/server';
import { splitNewAndDuplicates } from '@/domain/import/dedup';
import type { HashedTransaction } from '@/domain/import/types';

// Hashes per `in (...)` query: each is 64 characters and PostgREST puts the
// list in the URL, so a bank file of a few hundred rows is read in chunks.
const HASH_CHUNK = 100;
const INSERT_CHUNK = 500;

export type ImportAccount = {
  id: string;
  visibility: 'private' | 'shared';
  bankFormat: string | null;
};
type OwnedAccount = ImportAccount;

// The account must be one of the caller's own (RLS refuses inserts on other
// people's accounts anyway; reading first gives a clear answer and the
// visibility the imported movements inherit, ADR-015).
export async function getImportAccount(accountId: string): Promise<ImportAccount | null> {
  return getOwnAccount(accountId);
}

async function getOwnAccount(accountId: string): Promise<OwnedAccount | null> {
  const { user } = await requireMembership();
  const supabase = await createClient();
  const { data } = await supabase
    .from('accounts')
    .select('id, visibility, bank_format')
    .eq('id', accountId)
    .eq('owner_id', user.id)
    .maybeSingle();
  return data
    ? {
        id: data.id,
        visibility: data.visibility as OwnedAccount['visibility'],
        bankFormat: data.bank_format,
      }
    : null;
}

async function findExistingHashes(
  accountId: string,
  hashes: string[],
): Promise<Set<string> | null> {
  const supabase = await createClient();
  const found = new Set<string>();
  for (let i = 0; i < hashes.length; i += HASH_CHUNK) {
    const { data, error } = await supabase
      .from('transactions')
      .select('import_hash')
      .eq('account_id', accountId)
      .in('import_hash', hashes.slice(i, i + HASH_CHUNK));
    if (error) return null;
    for (const row of data) if (row.import_hash) found.add(row.import_hash);
  }
  return found;
}

export type ImportPreview =
  | { ok: true; rowsRead: number; fresh: HashedTransaction[]; duplicates: HashedTransaction[] }
  | { ok: false; code: 'account_not_found' | 'failed' };

// Read-only: what an import of these rows into this account would do.
export async function previewImport(
  accountId: string,
  hashed: HashedTransaction[],
): Promise<ImportPreview> {
  if (!(await getOwnAccount(accountId))) return { ok: false, code: 'account_not_found' };
  const existing = await findExistingHashes(
    accountId,
    hashed.map((t) => t.importHash),
  );
  if (!existing) return { ok: false, code: 'failed' };
  return { ok: true, rowsRead: hashed.length, ...splitNewAndDuplicates(hashed, existing) };
}

export type ImportResult =
  | { ok: true; importId: string; rowsRead: number; rowsInserted: number; rowsDuplicate: number }
  | { ok: false; code: 'account_not_found' | 'failed' };

// Writes the new rows of a file. Order matters for the log: the `imports` row
// is created first ('processing') so a failure leaves a 'failed' entry with
// its reason instead of nothing. Rows go in with ON CONFLICT DO NOTHING on
// (household_id, import_hash): if another upload of the same file slips in
// between preview and write, the unique constraint drops the repeats instead
// of failing the whole import (§8.3).
export async function runImport(input: {
  accountId: string;
  fileName: string;
  hashed: HashedTransaction[];
}): Promise<ImportResult> {
  const { user, householdId } = await requireMembership();
  const account = await getOwnAccount(input.accountId);
  if (!account) return { ok: false, code: 'account_not_found' };
  const supabase = await createClient();

  const rowsRead = input.hashed.length;
  const { data: imp, error: createError } = await supabase
    .from('imports')
    .insert({
      household_id: householdId,
      account_id: account.id,
      uploaded_by: user.id,
      file_name: input.fileName,
      rows_read: rowsRead,
    })
    .select('id')
    .single();
  if (createError || !imp) return { ok: false, code: 'failed' };

  const fail = async (message: string): Promise<ImportResult> => {
    await supabase.from('imports').update({ status: 'failed', error: message }).eq('id', imp.id);
    return { ok: false, code: 'failed' };
  };

  const existing = await findExistingHashes(
    account.id,
    input.hashed.map((t) => t.importHash),
  );
  if (!existing) return fail('could not read existing hashes');
  const { fresh } = splitNewAndDuplicates(input.hashed, existing);

  let rowsInserted = 0;
  for (let i = 0; i < fresh.length; i += INSERT_CHUNK) {
    const { data, error } = await supabase
      .from('transactions')
      .upsert(
        fresh.slice(i, i + INSERT_CHUNK).map((t) => ({
          household_id: householdId,
          account_id: account.id,
          import_id: imp.id,
          owner_id: user.id, // always the caller, never taken from the client
          booked_on: t.bookedOn,
          amount_cents: t.amountCents,
          description: t.description,
          raw_description: t.rawDescription,
          import_hash: t.importHash,
          visibility: account.visibility,
          visibility_overridden: false,
        })),
        { onConflict: 'household_id,import_hash', ignoreDuplicates: true },
      )
      .select('id');
    if (error) {
      // Earlier chunks are already in: take them back so a failed import
      // leaves no half file behind (the user can simply retry).
      await supabase.from('transactions').delete().eq('import_id', imp.id);
      return fail(error.message);
    }
    rowsInserted += data.length;
  }

  const { error: doneError } = await supabase
    .from('imports')
    .update({
      status: 'done',
      rows_inserted: rowsInserted,
      rows_duplicate: rowsRead - rowsInserted,
    })
    .eq('id', imp.id);
  if (doneError) return { ok: false, code: 'failed' };
  return {
    ok: true,
    importId: imp.id,
    rowsRead,
    rowsInserted,
    rowsDuplicate: rowsRead - rowsInserted,
  };
}

export type ImportSummary = {
  id: string;
  fileName: string;
  accountName: string | null;
  status: 'processing' | 'done' | 'failed' | 'undone';
  rowsRead: number;
  rowsInserted: number;
  rowsDuplicate: number;
  canUndo: boolean;
  // Most recent booking date among the rows this import added (null if none
  // left): the result page links to that month.
  lastBookedOn: string | null;
};

export async function getImportSummary(importId: string): Promise<ImportSummary | null> {
  const { user } = await requireMembership();
  const supabase = await createClient();
  const { data } = await supabase
    .from('imports')
    .select(
      'id, file_name, status, rows_read, rows_inserted, rows_duplicate, uploaded_by, accounts(name)',
    )
    .eq('id', importId)
    .maybeSingle();
  if (!data) return null;
  const status = data.status as ImportSummary['status'];
  let lastBookedOn: string | null = null;
  if (status === 'done' && data.rows_inserted > 0) {
    const { data: last } = await supabase
      .from('transactions')
      .select('booked_on')
      .eq('import_id', data.id)
      .order('booked_on', { ascending: false })
      .limit(1);
    lastBookedOn = last?.[0]?.booked_on ?? null;
  }
  return {
    id: data.id,
    fileName: data.file_name,
    accountName: data.accounts?.name ?? null,
    status,
    rowsRead: data.rows_read,
    rowsInserted: data.rows_inserted,
    rowsDuplicate: data.rows_duplicate,
    canUndo: status === 'done' && data.uploaded_by === user.id,
    lastBookedOn,
  };
}

export type UndoImportResult =
  | { ok: true; removed: number }
  | { ok: false; code: 'not_found' | 'not_allowed' | 'already_undone' | 'failed' };

// ADR-027: delete the rows of this import (never manual ones nor other
// imports') and mark it 'undone', counters untouched. The caller must have
// uploaded it or be an admin; transactions_delete in RLS says the same.
export async function undoImport(importId: string): Promise<UndoImportResult> {
  const { user, role } = await requireMembership();
  const supabase = await createClient();
  const { data: imp } = await supabase
    .from('imports')
    .select('id, status, uploaded_by')
    .eq('id', importId)
    .maybeSingle();
  if (!imp) return { ok: false, code: 'not_found' };
  if (imp.status === 'undone') return { ok: false, code: 'already_undone' };
  if (imp.status !== 'done') return { ok: false, code: 'failed' };
  if (imp.uploaded_by !== user.id && role !== 'admin') return { ok: false, code: 'not_allowed' };

  const { data: removed, error } = await supabase
    .from('transactions')
    .delete()
    .eq('import_id', imp.id)
    .select('id');
  if (error) return { ok: false, code: 'failed' };
  const { error: updateError } = await supabase
    .from('imports')
    .update({ status: 'undone' })
    .eq('id', imp.id);
  if (updateError) return { ok: false, code: 'failed' };
  return { ok: true, removed: removed.length };
}
