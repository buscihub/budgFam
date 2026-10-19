// Monthly summary: income, expenses, balance and a per-category breakdown
// (DESIGN_DOC §13.1 task 1.6). Pure domain logic — no Supabase, no Next.js
// (CLAUDE.md non-negotiable rule 3): the data layer fetches rows, this module
// only does arithmetic on amounts already in integer cents (rule 1).

export type CategoryKind = 'income' | 'expense' | 'transfer' | 'excluded';

export type SummaryCategory = {
  id: string;
  name: string;
  kind: CategoryKind;
};

export type SummaryTransaction = {
  amountCents: number; // negative = expense, per schema convention
  categoryId: string | null; // null = not yet categorized
};

export type CategoryBreakdownRow = {
  categoryId: string | null;
  categoryName: string;
  kind: CategoryKind | null; // null = uncategorized
  totalCents: number;
};

export type MonthlySummary = {
  incomeCents: number;
  expenseCents: number; // kept negative, consistent with amount_cents
  balanceCents: number;
  byCategory: CategoryBreakdownRow[];
};

const UNCATEGORIZED_NAME = 'Non categorizzato';

/**
 * Computes the monthly summary from a flat list of transactions.
 *
 * Scope decision (not in the original task description, but required by
 * DESIGN_DOC §6.1, which is binding per CLAUDE.md): transactions whose
 * category `kind` is 'transfer' are excluded from income/expense/balance and
 * from the breakdown. §6.1 says transfers never enter "Entrate" nor "Uscite"
 * — they get their own per-recipient line in a later task (3.4b, "Trasferimenti
 * ai familiari"). Building that line here would be scope creep (CLAUDE.md:
 * "non aggiungere funzioni fuori scope"), so for now transfers are simply
 * left out rather than half-shown. Categories with `kind = 'excluded'`
 * (ADR-017: B&B-style categories stay imported but out of every summary) are
 * dropped here too: the query in src/data does not filter by category kind, so
 * this function is where the rule lives.
 *
 * Uncategorized transactions (`categoryId: null`, or an id not found in
 * `categories`) are still real money, so they are not dropped: they count
 * towards income or expense based on their sign, and are grouped into one
 * "Non categorizzato" breakdown row.
 */
export function computeMonthlySummary(
  transactions: SummaryTransaction[],
  categories: SummaryCategory[],
): MonthlySummary {
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  let incomeCents = 0;
  let expenseCents = 0;
  const byCategory = new Map<string, CategoryBreakdownRow>();

  for (const tx of transactions) {
    const category = tx.categoryId ? (categoryById.get(tx.categoryId) ?? null) : null;

    if (category?.kind === 'excluded' || category?.kind === 'transfer') {
      continue;
    }

    if (tx.amountCents >= 0) {
      incomeCents += tx.amountCents;
    } else {
      expenseCents += tx.amountCents;
    }

    const key = category?.id ?? 'uncategorized';
    const existing = byCategory.get(key);
    if (existing) {
      existing.totalCents += tx.amountCents;
    } else {
      byCategory.set(key, {
        categoryId: category?.id ?? null,
        categoryName: category?.name ?? UNCATEGORIZED_NAME,
        kind: category?.kind ?? null,
        totalCents: tx.amountCents,
      });
    }
  }

  return {
    incomeCents,
    expenseCents,
    balanceCents: incomeCents + expenseCents,
    // Largest absolute amount first: the categories that moved the most
    // money are the ones worth looking at first in a monthly summary.
    byCategory: Array.from(byCategory.values()).sort(
      (a, b) => Math.abs(b.totalCents) - Math.abs(a.totalCents),
    ),
  };
}
