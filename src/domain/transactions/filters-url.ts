import { formatMonthParam } from './months';
import type { TransactionFilters } from './schemas';

// The URL of a movements list for a set of filters, with `patch` applied on
// top: how the month arrows and "azzera i filtri" keep (or drop) the rest of
// the view. `basePath` is the page showing the list: "/movimenti" (all
// accounts) or "/conti/<id>" (one account). On an account page the account is
// the path itself, so it never goes in the query string.
export function transactionsHref(
  filters: TransactionFilters,
  patch: Partial<TransactionFilters> = {},
  basePath = '/movimenti',
): string {
  const merged = { ...filters, ...patch };
  const params = new URLSearchParams();
  if (merged.month) params.set('mese', formatMonthParam(merged.month));
  if (merged.accountId && basePath === '/movimenti') params.set('conto', merged.accountId);
  if (merged.categoryId) params.set('categoria', merged.categoryId);
  if (merged.onlyToReview) params.set('daRivedere', '1');
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function countActiveFilters(filters: TransactionFilters): number {
  return [filters.accountId, filters.categoryId, filters.onlyToReview].filter(Boolean).length;
}
