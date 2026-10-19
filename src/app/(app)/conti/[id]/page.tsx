import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAccount } from '@/data/accounts';
import {
  ACCOUNT_KIND_LABELS,
  BANK_FORMAT_LABELS,
  deleteAccountSchema,
  type BankFormatId,
} from '@/domain/accounts/schemas';
import { transactionsHref } from '@/domain/transactions/filters-url';
import { parseTransactionFilters } from '@/domain/transactions/schemas';
import {
  BankIcon,
  CardIcon,
  CashIcon,
  ChevronLeftIcon,
  LockIcon,
  PersonIcon,
} from '../../../icons';
import { TransactionsView } from '../../movimenti/transactions-view';
import styles from '../conti.module.css';

const KIND_ICONS = { bank: <BankIcon />, card: <CardIcon />, cash: <CashIcon /> } as const;

export async function generateMetadata({ params }: PageProps<'/conti/[id]'>) {
  const { id } = await params;
  const account = deleteAccountSchema.safeParse({ id }).success ? await getAccount(id) : null;
  return { title: `${account?.name ?? 'Conto'} · budgFam` };
}

// The page of one account (ADR-035): its settings on top, its movements of the
// month below. An account the caller cannot see (somebody else's private one,
// or an invented id) is "not found": RLS decides, not this page.
export default async function AccountPage({ params, searchParams }: PageProps<'/conti/[id]'>) {
  const { id } = await params;
  if (!deleteAccountSchema.safeParse({ id }).success) notFound();
  const account = await getAccount(id);
  if (!account) notFound();
  const filters = parseTransactionFilters(await searchParams);

  const format =
    account.kind === 'cash'
      ? 'Nessun file da importare'
      : account.bankFormat
        ? (BANK_FORMAT_LABELS[account.bankFormat as BankFormatId] ?? account.bankFormat)
        : 'Formato da scegliere all’import';

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/conti" className="glass-btn" aria-label="Indietro, a Conti">
          <ChevronLeftIcon />
        </Link>
        <h1>{account.name}</h1>
        {account.canEdit ? (
          <Link
            href={`/conti/${account.id}/modifica?da=${encodeURIComponent(transactionsHref(filters, {}, `/conti/${account.id}`))}`}
            className={`glass-btn ${styles.headerAction}`}
          >
            Impostazioni
          </Link>
        ) : (
          <span style={{ width: 34 }} />
        )}
      </header>

      <p className={styles.info}>
        <span className={styles.infoIcon}>{KIND_ICONS[account.kind]}</span>
        <span>{ACCOUNT_KIND_LABELS[account.kind]}</span>
        <span className="pill">
          {account.visibility === 'private' && <LockIcon size={10} />}
          {account.visibility === 'private' ? 'Privato' : 'Condiviso'}
        </span>
        <span>{format}</span>
        {account.ownerName && (
          <span className="pill">
            <PersonIcon size={10} /> di {account.ownerName}
          </span>
        )}
      </p>

      <TransactionsView
        filters={filters}
        basePath={`/conti/${account.id}`}
        fixedAccountId={account.id}
        canAdd={account.canEdit}
        canImport={account.canEdit && account.kind !== 'cash'}
      />
    </main>
  );
}
