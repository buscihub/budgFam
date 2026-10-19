import Link from 'next/link';
import { listAccounts, type Account } from '@/data/accounts';
import { requireMembership } from '@/data/households';
import {
  ACCOUNT_KIND_LABELS,
  BANK_FORMAT_LABELS,
  type BankFormatId,
} from '@/domain/accounts/schemas';
import {
  BankIcon,
  CardIcon,
  CashIcon,
  ChevronRightIcon,
  InfoIcon,
  LockIcon,
  PersonIcon,
  PlusIcon,
} from '../../icons';
import styles from './conti.module.css';

export const metadata = { title: 'Conti · budgFam' };

const KIND_ICONS = { bank: <BankIcon />, card: <CardIcon />, cash: <CashIcon /> } as const;

function formatLabel(account: Account): string | null {
  if (account.kind === 'cash') return 'Nessun file da importare';
  if (!account.bankFormat) return 'Formato da scegliere all’import';
  return BANK_FORMAT_LABELS[account.bankFormat as BankFormatId] ?? account.bankFormat;
}

function VisibilityPill({ visibility }: { visibility: Account['visibility'] }) {
  return (
    <span className="pill">
      {visibility === 'private' && <LockIcon size={10} />}
      {visibility === 'private' ? 'Privato' : 'Condiviso'}
    </span>
  );
}

export default async function ContiPage() {
  const { role } = await requireMembership();
  const { mine, sharedByOthers } = await listAccounts();

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1>Conti</h1>
        <Link href="/conti/nuovo" className={`btn-primary ${styles.add}`} aria-label="Nuovo conto">
          <PlusIcon />
        </Link>
      </header>

      <Link href="/movimenti" className={`glass-card ${styles.allRow}`}>
        <span>Tutti i movimenti</span>
        <ChevronRightIcon />
      </Link>

      <section aria-label="I miei conti">
        <h2 className={styles.section}>
          I miei conti <span>{mine.length}</span>
        </h2>
        {mine.length === 0 ? (
          <div className={`glass-card ${styles.empty}`}>
            <h3>Non hai ancora un conto</h3>
            <p>
              Serve per importare gli estratti conto e per segnare le spese a mano. Nasce privato:
              lo vedi solo tu.
            </p>
            <Link href="/conti/nuovo" className="btn-primary" style={{ padding: '0 20px' }}>
              <PlusIcon /> Crea il tuo primo conto
            </Link>
          </div>
        ) : (
          <ul className={`glass-card ${styles.list}`}>
            {mine.map((account) => (
              <li key={account.id} className={styles.row}>
                <span className={styles.icon}>{KIND_ICONS[account.kind]}</span>
                <Link href={`/conti/${account.id}`} className={styles.name}>
                  {account.name}
                </Link>
                <span className={styles.meta}>
                  <span>{ACCOUNT_KIND_LABELS[account.kind]}</span>
                  <VisibilityPill visibility={account.visibility} />
                  <span>{formatLabel(account)}</span>
                </span>
                <span className={styles.actions}>
                  <Link href={`/conti/${account.id}/modifica?da=${encodeURIComponent('/conti')}`}>
                    Impostazioni
                  </Link>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Condivisi dalla famiglia">
        <h2 className={styles.section}>
          Condivisi dalla famiglia <small>Solo lettura</small>
        </h2>
        {sharedByOthers.length === 0 ? (
          <div className={`glass-card ${styles.empty}`}>
            <p>Nessun conto condiviso dagli altri.</p>
          </div>
        ) : (
          <ul className={`glass-card ${styles.list}`}>
            {sharedByOthers.map((account) => (
              <li key={account.id} className={styles.row}>
                <span className={styles.icon}>{KIND_ICONS[account.kind]}</span>
                <Link href={`/conti/${account.id}`} className={styles.name}>
                  {account.name}
                </Link>
                <span className={styles.meta}>
                  <span>{ACCOUNT_KIND_LABELS[account.kind]}</span>
                  <VisibilityPill visibility={account.visibility} />
                  <span className="pill">
                    <PersonIcon size={10} /> di {account.ownerName}
                  </span>
                </span>
                <span className={styles.actions}>
                  {role === 'admin' && (
                    <Link href={`/conti/${account.id}/elimina`} className={styles.delete}>
                      Elimina
                    </Link>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className={styles.note}>
        <InfoIcon />
        <span>
          I conti privati li vedi solo tu. La famiglia vede soltanto quelli condivisi, e li gestisce
          chi li ha creati.
        </span>
      </p>
    </main>
  );
}
