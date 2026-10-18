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
