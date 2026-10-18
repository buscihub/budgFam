export type MonthKey = { year: number; month: number }; // month is 1-12

const pad = (n: number) => String(n).padStart(2, '0');

// "2026-09" -> { year: 2026, month: 9 }. Anything else is null: a hand-edited
// URL falls back to the current month instead of failing.
export function parseMonthParam(raw: string | undefined): MonthKey | null {
  const match = /^(\d{4})-(\d{2})$/.exec(raw ?? '');
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12 || year < 2000 || year > 2100) return null;
  return { year, month };
}

export function formatMonthParam({ year, month }: MonthKey): string {
  return `${year}-${pad(month)}`;
}

export function shiftMonth({ year, month }: MonthKey, delta: number): MonthKey {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export function compareMonths(a: MonthKey, b: MonthKey): number {
  return a.year * 12 + a.month - (b.year * 12 + b.month);
}

const LABEL = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric', timeZone: 'UTC' });

// "Settembre 2026"
export function monthLabel({ year, month }: MonthKey): string {
  const text = LABEL.format(new Date(Date.UTC(year, month - 1, 1)));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// First day of the month and first day of the next one, as `date` strings (no
// time part, rule 11). Half-open, so no `<=` on "the last day" is needed.
export function monthRange(month: MonthKey): { from: string; to: string } {
  const next = shiftMonth(month, 1);
  return {
    from: `${month.year}-${pad(month.month)}-01`,
    to: `${next.year}-${pad(next.month)}-01`,
  };
}
