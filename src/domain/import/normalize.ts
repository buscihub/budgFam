import type { BankFormat, NormalizedTransaction, ParsedTransaction } from './types';

type NumberFormat = Pick<BankFormat, 'decimalSeparator' | 'thousandsSeparator'>;

// Converts a bank-formatted amount ("-€1.234,56", "6.20", ",50") to signed
// integer cents using string arithmetic only: no float ever holds the value
// (rule 1), so there is no rounding to get wrong. Returns null when the text
// isn't a plain amount (empty, no digits, two decimal points, a non-zero
// digit beyond the cents, or too big to be a safe integer). Trailing zeros
// past the cents are fine ("-39.500000", as Trade Republic writes them).
// Rejecting beats guessing: a silently rounded amount would corrupt totals
// and dedup hashes.
export function parseAmountToCents(raw: string, format: NumberFormat): number | null {
  let value = raw.trim();
  if (!value) return null;
  const isNegative = value.includes('-');
  value = value.replace(/-/g, '');
  if (format.thousandsSeparator) {
    value = value.split(format.thousandsSeparator).join('');
  }
  // Drop currency symbols, spaces, etc., keeping digits and the decimal mark.
  const keep = new RegExp(`[^0-9${format.decimalSeparator === '.' ? '\\.' : ','}]`, 'g');
  value = value.replace(keep, '');

  const parts = value.split(format.decimalSeparator);
  if (parts.length > 2) return null;
  const whole = parts[0]!;
  const fraction = parts[1] ?? '';
  if (!whole && !fraction) return null;
  if (/[1-9]/.test(fraction.slice(2))) return null;

  const cents = Number(whole || '0') * 100 + Number(fraction.slice(0, 2).padEnd(2, '0'));
  if (!Number.isSafeInteger(cents)) return null;
  return isNegative && cents !== 0 ? -cents : cents;
}

const ROME_DATE = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Rome',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

// Converts a UTC instant ("2026-02-16T23:06:14.607Z") to the booking date in
// Europe/Rome (rule 11): that movement is on the 17th for the user, not the
// 16th. Only accepts a full ISO instant ending in Z; anything else is null,
// so a date-only value is never silently read as midnight UTC.
export function toRomeDate(isoInstant: string): string | null {
  const value = isoInstant.trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(value)) return null;
  const instant = new Date(value);
  return Number.isNaN(instant.getTime()) ? null : ROME_DATE.format(instant);
}

// IBANs never reach the AI (rule 4.1.5) and are noise for rules and dedup.
// Country code + 2 check digits + 11-30 alphanumerics, matched after
// uppercasing so lower-case text is caught too; wrapping parentheses go with
// it, so no empty "()" is left behind.
const IBAN = /\(?\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b\)?/g;

// A "long numeric token" is a whole word of 6+ digits: operation and
// authorization numbers that differ on every statement line for the same
// merchant. Shorter numbers (shop branch "COOP 123", "24H") and digits glued
// to letters ("REF123456") are kept on purpose: removing more would merge
// distinct merchants, and rules/dedup (§8.3, §8.4) need them told apart.
const LONG_NUMERIC_TOKEN = /^\d{6,}$/;

// Uppercase, variable codes removed, whitespace collapsed (§8.2). Idempotent:
// normalizing an already-normalized description changes nothing.
export function normalizeDescription(raw: string): string {
  return raw
    .toUpperCase()
    .replace(IBAN, ' ')
    .split(/\s+/)
    .filter((token) => token !== '' && !LONG_NUMERIC_TOKEN.test(token))
    .join(' ');
}

export function normalizeTransactions(parsed: ParsedTransaction[]): NormalizedTransaction[] {
  return parsed.map((t) => ({
    bookedOn: t.bookedOn,
    description: normalizeDescription(t.rawDescription),
    amountCents: t.amountCents,
    ...(t.externalId !== undefined && { externalId: t.externalId }),
    ...(t.kind !== undefined && { kind: t.kind }),
  }));
}
