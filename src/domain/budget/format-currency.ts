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

// Like formatCents, but money coming in carries an explicit "+": the lists show
// "+1.450,00 €" next to "-42,30 €".
export function formatSignedCents(cents: number): string {
  return cents > 0 ? `+${formatCents(cents)}` : formatCents(cents);
}
