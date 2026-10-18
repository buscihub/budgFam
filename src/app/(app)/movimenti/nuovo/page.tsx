import Link from 'next/link';
import { listAccounts } from '@/data/accounts';
import { listCategories } from '@/data/categories';
import { todayInRome } from '@/domain/transactions/dates';
import { NewTransactionForm } from './new-transaction-form';

export const metadata = { title: 'Nuovo movimento · budgFam' };

export default async function NewTransactionPage() {
  const [{ mine }, categories] = await Promise.all([listAccounts(), listCategories()]);

  return (
    <main className="auth-page">
      <h1>Nuovo movimento</h1>
      {mine.length === 0 ? (
        <p>
          Per aggiungere un movimento serve un conto (anche «Contanti»).{' '}
          <Link href="/conti">Crea un conto</Link>
        </p>
      ) : (
        <NewTransactionForm accounts={mine} categories={categories} today={todayInRome()} />
      )}
      {/* "Importa file" joins this screen with task 1.5 (ADR-013). */}
      <p>
        <Link href="/movimenti">Annulla</Link>
      </p>
    </main>
  );
}
