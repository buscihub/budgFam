import 'server-only';
import { requireMembership } from './households';
import { createClient } from './supabase/server';
import {
  computeMonthlySummary,
  type MonthlySummary,
  type SummaryCategory,
  type SummaryTransaction,
} from '@/domain/budget/monthly-summary';

export type MonthKey = { year: number; month: number }; // month is 1-12

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

// First day of the month and first day of the next one, as `date` strings
// (no time part — rule 11): a half-open range avoids DST/timezone edge cases
// that `<=` on the last day could hit.
function monthRange({ year, month }: MonthKey): { from: string; to: string } {
  const pad = (n: number) => String(n).padStart(2, '0');
  const from = `${year}-${pad(month)}-01`;
  const nextMonth = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
  const to = `${nextMonth.year}-${pad(nextMonth.month)}-01`;
  return { from, to };
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
