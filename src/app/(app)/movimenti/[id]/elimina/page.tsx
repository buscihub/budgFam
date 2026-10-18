import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTransaction } from '@/data/transactions';
import { formatCents } from '@/domain/budget/format-currency';
import { deleteTransactionSchema } from '@/domain/transactions/schemas';
import { deleteTransactionAction } from '../../actions';

export const metadata = { title: 'Elimina movimento · budgFam' };

// Confirmation page, same pattern as deleting an account: a delete cannot be undone.
export default async function DeleteTransactionPage({
  params,
}: PageProps<'/movimenti/[id]/elimina'>) {
  const { id } = await params;
  if (!deleteTransactionSchema.safeParse({ id }).success) notFound();

  const tx = await getTransaction(id);
  if (!tx || !tx.canDelete) notFound();

  return (
    <main className="auth-page">
      <h1>Elimina il movimento</h1>
      <p>
        «{tx.description}», {formatCents(tx.amountCents)}. L’operazione non si può annullare.
      </p>
      <form action={deleteTransactionAction} className="auth-form">
        <input type="hidden" name="id" value={tx.id} />
        <button type="submit">Elimina</button>
      </form>
      <p>
        <Link href={`/movimenti/${tx.id}`}>Annulla</Link>
      </p>
    </main>
  );
}
