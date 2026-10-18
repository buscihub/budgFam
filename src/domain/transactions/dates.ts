const ROME_DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Rome',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

// Today's date in Europe/Rome as YYYY-MM-DD (rule 11). The server runs in UTC,
// so just after midnight in Rome `new Date().toISOString()` is still yesterday.
export function todayInRome(now: Date = new Date()): string {
  return ROME_DAY.format(now);
}

const DISPLAY = new Intl.DateTimeFormat('it-IT', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

// "2026-10-17" -> "17 ott 2026". A booking date has no time and no zone, so it
// is read as UTC midnight and shown in UTC: no zone can move it to another day.
export function formatBookedOn(isoDate: string): string {
  return DISPLAY.format(new Date(`${isoDate}T00:00:00Z`));
}

// The date `days` days before an ISO date, as an ISO date. Calendar arithmetic
// on UTC midnights: no zone and no daylight saving can shift the result.
export function subtractDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

const SHORT_MONTH = new Intl.DateTimeFormat('it-IT', { month: 'short', timeZone: 'UTC' });

// "2026-09-24" -> { day: "24", month: "set" }: the date block of a list row.
export function formatDayMonth(isoDate: string): { day: string; month: string } {
  const date = new Date(`${isoDate}T00:00:00Z`);
  return { day: String(date.getUTCDate()), month: SHORT_MONTH.format(date).replace('.', '') };
}
