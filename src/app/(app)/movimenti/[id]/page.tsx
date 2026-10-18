import Link from 'next/link';
import { notFound } from 'next/navigation';
import { listCategories } from '@/data/categories';
import { getTransaction } from '@/data/transactions';
import { formatSignedCents } from '@/domain/budget/format-currency';
import { formatBookedOn } from '@/domain/transactions/dates';
import { humanizeDescription } from '@/domain/transactions/display';
import { deleteTransactionSchema } from '@/domain/transactions/schemas';
import { CloseIcon, LockIcon } from '../../../icons';
import sheet from '../../sheet-page.module.css';
import styles from './dettaglio.module.css';
import { EditTransactionForm } from './edit-transaction-form';

export const metadata = { title: 'Movimento · budgFam' };

export default async function TransactionPage({ params }: PageProps<'/movimenti/[id]'>) {
  const { id } = await params;
  if (!deleteTransactionSchema.safeParse({ id }).success) notFound();

  const [tx, categories] = await Promise.all([
    getTransaction(id),
    listCategories({ includeHidden: true }),
  ]);
  if (!tx) notFound();

  // Hidden categories stay in the picker only when this movement already uses one (ADR-017).
  const pickable = categories.filter((c) => !c.isHidden || c.id === tx.categoryId);

  return (
    <div className={sheet.overlay}>
      <main className={`${sheet.panel} glass-sheet`}>
        <div className={sheet.header}>
          <Link href="/movimenti" className="glass-btn" aria-label="Chiudi">
            <CloseIcon />
          </Link>
          <span>Movimento</span>
          <span className={sheet.spacer} />
        </div>

        <div className={sheet.scroll} style={{ flex: 'none', paddingBottom: 0 }}>
          <div className={styles.summary}>
            <div className={styles.date}>{formatBookedOn(tx.bookedOn)}</div>
            <h1 className={styles.title}>{humanizeDescription(tx.description)}</h1>
            <div className={`${styles.amount} ${tx.amountCents > 0 ? styles.income : ''}`}>
              {formatSignedCents(tx.amountCents)}
            </div>
            <div className={styles.tags}>
              <span className="pill">
                {tx.visibility === 'private' && <LockIcon size={11} />}
                {tx.visibility === 'private' ? 'Privato' : 'Condiviso'}
              </span>
              <span>{tx.accountName ?? 'Conto non disponibile'}</span>
            </div>
            {tx.rawDescription !== tx.description && (
              <div className={styles.tags}>Testo originale: {tx.rawDescription}</div>
            )}
          </div>
        </div>

        <EditTransactionForm tx={tx} categories={pickable} />
      </main>
    </div>
  );
}
