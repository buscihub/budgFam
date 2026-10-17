import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDeletionImpact } from '@/data/accounts';
import { deleteAccountSchema } from '@/domain/accounts/schemas';
import { deleteAccountAction } from '../../actions';

export const metadata = { title: 'Elimina conto · budgFam' };

// Confirmation page (ADR-033): says exactly what the delete will do, because
// it cannot be undone. A page instead of a client-side dialog keeps it working
// without JavaScript state and makes the numbers come from the server.
export default async function DeleteAccountPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!deleteAccountSchema.safeParse({ id }).success) notFound();

  const impact = await getDeletionImpact(id);
  if (!impact) notFound();
  const { account, privateTransactions, sharedTransactions } = impact;

  return (
    <main className="auth-page">
      <h1>Elimina «{account.name}»</h1>
      <ul>
        <li>
          {privateTransactions} movimenti privati verranno <strong>cancellati</strong>.
        </li>
        <li>
          {sharedTransactions} movimenti condivisi <strong>restano</strong> nei riepiloghi della
          famiglia, senza più un conto.
        </li>
      </ul>
      <p>L’operazione non si può annullare.</p>

      <form action={deleteAccountAction} className="auth-form">
        <input type="hidden" name="id" value={account.id} />
        <button type="submit">Elimina il conto</button>
      </form>
      <p>
        <Link href="/conti">Annulla</Link>
      </p>
    </main>
  );
}
