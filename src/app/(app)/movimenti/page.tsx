import Link from 'next/link';
import { requireMembership } from '@/data/households';
import { parseTransactionFilters } from '@/domain/transactions/schemas';
import { ChevronLeftIcon } from '../../icons';
import styles from '../conti/conti.module.css';
import { TransactionsView } from './transactions-view';

export const metadata = { title: 'Tutti i movimenti · budgFam' };

// "Tutti i movimenti" (ADR-035): every account, with the account filter. It is
// reached from Conti, which is the navigation entry that owns it.
export default async function MovimentiPage({ searchParams }: PageProps<'/movimenti'>) {
  await requireMembership();
  const filters = parseTransactionFilters(await searchParams);
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/conti" className="glass-btn" aria-label="Indietro, a Conti">
          <ChevronLeftIcon />
        </Link>
        <h1>Tutti i movimenti</h1>
        <span style={{ width: 34 }} />
      </header>
      <TransactionsView filters={filters} basePath="/movimenti" />
    </main>
  );
}
