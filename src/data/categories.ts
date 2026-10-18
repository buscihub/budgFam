import 'server-only';
import { requireMembership } from './households';
import { createClient } from './supabase/server';

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
