import { formatMonthParam } from './months';
import type { TransactionFilters } from './schemas';

// The Movimenti URL for a set of filters, with `patch` applied on top: how the
// month arrows and "azzera i filtri" keep (or drop) the rest of the view.
export function transactionsHref(
  filters: TransactionFilters,
  patch: Partial<TransactionFilters> = {},
): string {
  const merged = { ...filters, ...patch };
  const params = new URLSearchParams();
  if (merged.month) params.set('mese', formatMonthParam(merged.month));
  if (merged.accountId) params.set('conto', merged.accountId);
  if (merged.categoryId) params.set('categoria', merged.categoryId);
  if (merged.onlyToReview) params.set('daRivedere', '1');
  const query = params.toString();
  return query ? `/movimenti?${query}` : '/movimenti';
}

export function countActiveFilters(filters: TransactionFilters): number {
  return [filters.accountId, filters.categoryId, filters.onlyToReview].filter(Boolean).length;
}
