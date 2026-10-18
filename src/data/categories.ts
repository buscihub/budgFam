import 'server-only';
import { requireMembership } from './households';
import { createClient } from './supabase/server';
import { subtractDays, todayInRome } from '@/domain/transactions/dates';

export type Category = {
  id: string;
  name: string;
  kind: 'income' | 'expense' | 'transfer' | 'excluded';
  isHidden: boolean;
};

// Hidden categories (ADR-017) stay out of the pickers but still label the
// transactions that already use them, so callers say which list they want.
export async function listCategories({
  includeHidden = false,
}: { includeHidden?: boolean } = {}): Promise<Category[]> {
  const { householdId } = await requireMembership();
  const supabase = await createClient();
  let query = supabase
    .from('categories')
    .select('id, name, kind, is_hidden')
    .eq('household_id', householdId)
    .order('name');
  if (!includeHidden) query = query.eq('is_hidden', false);
  const { data } = await query;
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    // `kind` is text + CHECK in Postgres, so the generated type is plain string.
    kind: row.kind as Category['kind'],
    isHidden: row.is_hidden,
  }));
}

const USAGE_WINDOW_DAYS = 90;

// How many movements the household put in each category in the last 90 days:
// the "add" form suggests the most used ones as quick chips. Counted here
// because PostgREST has no group-by; the window keeps the read small.
export async function getCategoryUsage(): Promise<Record<string, number>> {
  const { householdId } = await requireMembership();
  const supabase = await createClient();
  const { data } = await supabase
    .from('transactions')
    .select('category_id')
    .eq('household_id', householdId)
    .not('category_id', 'is', null)
    .gte('booked_on', subtractDays(todayInRome(), USAGE_WINDOW_DAYS));

  const usage: Record<string, number> = {};
  for (const row of data ?? []) {
    if (row.category_id) usage[row.category_id] = (usage[row.category_id] ?? 0) + 1;
  }
  return usage;
}
