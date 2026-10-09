import { requireMembership } from '@/data/households';
import { getCurrentMonthRome, getMonthlySummary } from '@/data/transactions';
import { formatCents } from '@/domain/budget/format-currency';

// Monthly summary page (DESIGN_DOC §13.1 task 1.6): income, expenses, balance
// and a per-category breakdown for the current month. Server Component only
// — no Supabase client here (CLAUDE.md non-negotiable rule 2): everything
// comes from `src/data/transactions.ts`.
export default async function RiepilogoPage() {
  // Not used directly below, but this is the page's auth/membership gate —
  // same pattern as the home page — before touching any household data.
  await requireMembership();

  const month = getCurrentMonthRome();
  const summary = await getMonthlySummary(month);

  const monthLabel = new Intl.DateTimeFormat('it-IT', {
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Rome',
  }).format(new Date(month.year, month.month - 1, 1));

  return (
    <main className="auth-page">
      <h1>Riepilogo di {monthLabel}</h1>

      <dl>
        <dt>Entrate</dt>
        <dd>{formatCents(summary.incomeCents)}</dd>
        <dt>Uscite</dt>
        <dd>{formatCents(summary.expenseCents)}</dd>
        <dt>Saldo</dt>
        <dd>{formatCents(summary.balanceCents)}</dd>
      </dl>

      <h2>Per categoria</h2>
      {summary.byCategory.length === 0 ? (
        <p>Nessun movimento condiviso questo mese.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th scope="col">Categoria</th>
              <th scope="col">Totale</th>
            </tr>
          </thead>
          <tbody>
            {summary.byCategory.map((row) => (
              <tr key={row.categoryId ?? 'uncategorized'}>
                <td>{row.categoryName}</td>
                <td>{formatCents(row.totalCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
