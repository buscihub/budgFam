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
