const formatter = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
});

// Amounts are always integer cents (CLAUDE.md, non-negotiable rule 1): never floats.
export function formatCents(cents: number): string {
  if (!Number.isInteger(cents)) {
    throw new Error(`formatCents expects an integer number of cents, got ${cents}`);
  }
  return formatter.format(cents / 100);
}
