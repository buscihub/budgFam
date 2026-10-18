export type CategoryKind = 'income' | 'expense' | 'transfer' | 'excluded';

export type PickableCategory = { id: string; name: string; kind: CategoryKind; isHidden: boolean };

// Which category kinds belong to a money direction: an expense is categorised
// as an expense, income as income. `transfer` and `excluded` are reachable from
// the full picker ("Altro…"), not suggested as quick chips (ADR-031: the
// behaviour depends on the kind, never on the name).
const KINDS_FOR_DIRECTION: Record<'expense' | 'income', CategoryKind> = {
  expense: 'expense',
  income: 'income',
};

// The quick chips of the "add" form: the categories this household used most
// recently, for the chosen direction. Ties keep the input order (the caller
// passes them sorted by name), so the result is stable.
export function pickTopCategories(
  categories: PickableCategory[],
  usage: Record<string, number>,
  direction: 'expense' | 'income',
  limit = 4,
): PickableCategory[] {
  return categories
    .filter((c) => !c.isHidden && c.kind === KINDS_FOR_DIRECTION[direction])
    .map((category, index) => ({ category, index, used: usage[category.id] ?? 0 }))
    .sort((a, b) => b.used - a.used || a.index - b.index)
    .slice(0, limit)
    .map(({ category }) => category);
}
