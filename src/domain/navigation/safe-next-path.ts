// A "where to go next" value that came from a form field, which the client can
// forge. Only a plain path of this app is accepted: it starts with a single
// "/" and uses a short, safe alphabet. Anything else is null, so the caller
// stays on the page. Whitelisting characters (rather than blacklisting "//")
// also stops "/\evil.com", which browsers read as "//evil.com", and encoded or
// control characters that a browser might normalize into one.
const SAFE_PATH = /^\/[A-Za-z0-9_\-./?=&~]*$/;

export function safeNextPath(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  if (!SAFE_PATH.test(value) || value.includes('//') || value.includes('/..')) return null;
  return value;
}

// Where a page sends the person back to ("da" in the URL): the safe path they
// came from, or `fallback`. Add, import and detail pages carry it along so
// that closing or saving returns to the account page or to "Tutti i movimenti"
// they started from (ADR-035).
export function returnPath(value: unknown, fallback = '/movimenti'): string {
  return safeNextPath(value) ?? fallback;
}

// The same list page, showing another month: used after adding or importing
// movements so the person lands on the month where they are, not on the one
// they left (a movement dated in March is invisible in a list showing May).
// `month` is "YYYY-MM"; the path keeps its other filters.
export function withMonthParam(path: string, month: string): string {
  const [pathname = '', query = ''] = path.split('?');
  const params = new URLSearchParams(query);
  params.set('mese', month);
  return `${pathname}?${params.toString()}`;
}
