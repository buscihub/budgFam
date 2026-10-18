import Link from 'next/link';
import { notFound } from 'next/navigation';
import { listCategories } from '@/data/categories';
import { getTransaction } from '@/data/transactions';
import { formatCents } from '@/domain/budget/format-currency';
import { formatBookedOn } from '@/domain/transactions/dates';
import { deleteTransactionSchema } from '@/domain/transactions/schemas';
import { EditTransactionForm } from './edit-transaction-form';

export const metadata = { title: 'Movimento · budgFam' };

export default async function TransactionPage({ params }: PageProps<'/movimenti/[id]'>) {
  const { id } = await params;
  if (!deleteTransactionSchema.safeParse({ id }).success) notFound();

  const [tx, categories] = await Promise.all([
    getTransaction(id),
    // Hidden categories stay in the picker only when this movement already uses one (ADR-017).
    listCategories({ includeHidden: true }),
  ]);
  if (!tx) notFound();

  const pickable = categories.filter((c) => !c.isHidden || c.id === tx.categoryId);

  return (
    <main className="auth-page">
      <p>
        <Link href="/movimenti">← Movimenti</Link>
      </p>
      <h1>{tx.description}</h1>
      <dl>
        <dt>Importo</dt>
        <dd>{formatCents(tx.amountCents)}</dd>
        <dt>Data</dt>
        <dd>{formatBookedOn(tx.bookedOn)}</dd>
        <dt>Conto</dt>
        <dd>{tx.accountName ?? 'Non disponibile'}</dd>
        {tx.rawDescription !== tx.description && (
          <>
            <dt>Testo originale</dt>
            <dd>{tx.rawDescription}</dd>
          </>
        )}
      </dl>

      <EditTransactionForm tx={tx} categories={pickable} />

      {tx.canDelete && (
        <p>
          <Link href={`/movimenti/${tx.id}/elimina`}>Elimina il movimento</Link>
        </p>
      )}
    </main>
  );
}
