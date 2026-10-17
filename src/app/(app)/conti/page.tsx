import Link from 'next/link';
import { listAccounts, type Account } from '@/data/accounts';
import { requireMembership } from '@/data/households';
import {
  ACCOUNT_KIND_LABELS,
  ACCOUNT_VISIBILITY_LABELS,
  BANK_FORMAT_LABELS,
  type BankFormatId,
} from '@/domain/accounts/schemas';
import { NewAccountForm } from './new-account-form';

export const metadata = { title: 'Conti · budgFam' };

function formatLabel(account: Account): string | null {
  if (account.kind === 'cash') return null;
  if (!account.bankFormat) return 'formato da scegliere all’import';
  return BANK_FORMAT_LABELS[account.bankFormat as BankFormatId] ?? account.bankFormat;
}

export default async function ContiPage() {
  const { role } = await requireMembership();
  const { mine, sharedByOthers } = await listAccounts();

  return (
    <main className="auth-page">
      <h1>Conti</h1>

      <h2>I miei conti</h2>
      {mine.length === 0 ? (
        <p>Non hai ancora nessun conto.</p>
      ) : (
        <ul>
          {mine.map((account) => (
            <li key={account.id}>
              {account.name} — {ACCOUNT_KIND_LABELS[account.kind]},{' '}
              {ACCOUNT_VISIBILITY_LABELS[account.visibility].toLowerCase()}
              {formatLabel(account) && `, ${formatLabel(account)}`}{' '}
              <Link href={`/conti/${account.id}/elimina`}>Elimina</Link>
            </li>
          ))}
        </ul>
      )}

      <h2>Condivisi dalla famiglia</h2>
      {sharedByOthers.length === 0 ? (
        <p>Nessun conto condiviso dagli altri.</p>
      ) : (
        <ul>
          {sharedByOthers.map((account) => (
            <li key={account.id}>
              {account.name} — di {account.ownerName}{' '}
              {role === 'admin' && <Link href={`/conti/${account.id}/elimina`}>Elimina</Link>}
            </li>
          ))}
        </ul>
      )}

      <h2>Nuovo conto</h2>
      <NewAccountForm />
    </main>
  );
}
