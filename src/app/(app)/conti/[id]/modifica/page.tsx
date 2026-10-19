import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAccount } from '@/data/accounts';
import { returnPath } from '@/domain/navigation/safe-next-path';
import { deleteAccountSchema } from '@/domain/accounts/schemas';
import { todayInRome } from '@/domain/transactions/dates';
import { CloseIcon } from '../../../../icons';
import sheet from '../../../sheet-page.module.css';
import { EditAccountForm } from './edit-account-form';

export const metadata = { title: 'Impostazioni del conto · budgFam' };

// Account settings (ADR-035): name, file format and who sees the account (with
// the preview of ADR-015), only for the owner. The kind never changes (ADR-025).
export default async function EditAccountPage({
  params,
  searchParams,
}: PageProps<'/conti/[id]/modifica'>) {
  const { id } = await params;
  // Closing, cancelling and saving go back to where the person came from: the
  // list of accounts or the account page ("da"), the list by default.
  const from = returnPath((await searchParams).da, '/conti');
  if (!deleteAccountSchema.safeParse({ id }).success) notFound();
  const account = await getAccount(id);
  if (!account || !account.canEdit) notFound();

  return (
    <div className={sheet.overlay}>
      <main className={`${sheet.panel} glass-sheet`}>
        <div className={sheet.header}>
          <Link href={from} className="glass-btn" aria-label="Chiudi">
            <CloseIcon />
          </Link>
          <h1 style={{ font: 'inherit' }}>Impostazioni del conto</h1>
          <span className={sheet.spacer} />
        </div>
        <EditAccountForm account={account} today={todayInRome()} from={from} />
      </main>
    </div>
  );
}
