import { requireMembership } from '@/data/households';
import { getCurrentMonthRome, getMonthlySummary } from '@/data/transactions';
import { formatCents, formatSignedCents } from '@/domain/budget/format-currency';
import {
  compareMonths,
  formatMonthParam,
  monthLabel,
  parseMonthParam,
} from '@/domain/transactions/months';
import { MonthBar } from '../month-bar';
import styles from './riepilogo.module.css';

export const metadata = { title: 'Riepilogo · budgFam' };

// Monthly summary page (DESIGN_DOC §13.1 task 1.6): income, expenses, balance
// and a per-category breakdown for the chosen month (the current one by default). Server Component only
// — no Supabase client here (CLAUDE.md non-negotiable rule 2): everything
// comes from `src/data/transactions.ts`. Drawn after the mockups (ADR-012);
// the Famiglia/Personale switch and the budget bars arrive with tasks 3.2/3.2b.
export default async function RiepilogoPage({ searchParams }: PageProps<'/riepilogo'>) {
  // Not used directly below, but this is the page's auth/membership gate —
  // same pattern as the home page — before touching any household data.
  await requireMembership();

  // The month comes from the URL (?mese=2026-09); anything missing or malformed
  // shows the current month, like the movements list.
  const current = getCurrentMonthRome();
  const requested = (await searchParams).mese;
  const month = parseMonthParam(typeof requested === 'string' ? requested : undefined) ?? current;
  const summary = await getMonthlySummary(month);

  return (
    <main className={styles.page}>
      <h1 className={`${styles.title}`}>Riepilogo</h1>
      <MonthBar
        month={month}
        current={current}
        hrefFor={(m) =>
          compareMonths(m, current) >= 0 ? '/riepilogo' : `/riepilogo?mese=${formatMonthParam(m)}`
        }
      />

      <section className={`glass-card ${styles.hero}`}>
        <div className={styles.heroLabel}>Saldo di famiglia</div>
        <div className={`${styles.heroValue} ${summary.balanceCents > 0 ? styles.positive : ''}`}>
          {formatSignedCents(summary.balanceCents)}
        </div>
      </section>

      <div className={styles.split}>
        <section className={`glass-card ${styles.stat}`}>
          <div className={styles.statLabel}>Entrate</div>
          <div className={styles.statValue}>{formatCents(summary.incomeCents)}</div>
        </section>
        <section className={`glass-card ${styles.stat}`}>
          <div className={styles.statLabel}>Uscite</div>
          <div className={styles.statValue}>{formatCents(summary.expenseCents)}</div>
        </section>
      </div>

      <h2 className={styles.section}>Per categoria</h2>
      {summary.byCategory.length === 0 ? (
        <p className={`glass-card ${styles.empty}`}>
          Nessun movimento condiviso a {monthLabel(month).toLowerCase()}.
        </p>
      ) : (
        <ul className={`glass-card ${styles.list}`}>
          {summary.byCategory.map((row) => (
            <li key={row.categoryId ?? 'uncategorized'} className={styles.item}>
              <span>{row.categoryName}</span>
              <span className={styles.amount}>{formatSignedCents(row.totalCents)}</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
