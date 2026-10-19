import Link from 'next/link';
import { listAccounts } from '@/data/accounts';
import { getCategoryUsage, listCategories } from '@/data/categories';
import { returnPath } from '@/domain/navigation/safe-next-path';
import { todayInRome } from '@/domain/transactions/dates';
import { CloseIcon } from '../../../icons';
import sheet from '../../sheet-page.module.css';
import { NewTransactionForm } from './new-transaction-form';

export const metadata = { title: 'Nuovo movimento · budgFam' };

export default async function NewTransactionPage({ searchParams }: PageProps<'/movimenti/nuovo'>) {
  const params = await searchParams;
  const from = returnPath(params.da);
  const [{ mine }, categories, usage] = await Promise.all([
    listAccounts(),
    listCategories(),
    getCategoryUsage(),
  ]);

  // The account the person came from, if it is one of theirs (ADR-035).
  const wanted = typeof params.conto === 'string' ? params.conto : undefined;
  const requested = mine.find((a) => a.id === wanted)?.id ?? null;
  const initialAccountId = requested ?? (mine.length === 1 ? mine[0]!.id : null);
  // Cash has no file to import (ADR-025): when the account is cash, or there is
  // no other kind, the "Importa file" tab would lead nowhere useful.
  const lockedCash = mine.find((a) => a.id === requested)?.kind === 'cash';
  const showImportTab = !lockedCash && mine.some((a) => a.kind !== 'cash');
  const importHref = `/movimenti/importa?da=${encodeURIComponent(from)}${
    requested ? `&conto=${requested}` : ''
  }`;

  return (
    <div className={sheet.overlay}>
      <main className={`${sheet.panel} glass-sheet`}>
        <div className={sheet.header}>
          <Link href={from} className="glass-btn" aria-label="Chiudi">
            <CloseIcon />
          </Link>
          <h1 style={{ font: 'inherit' }}>Aggiungi movimento</h1>
          <span className={sheet.spacer} />
        </div>

        {showImportTab && (
          <div className={sheet.scroll} style={{ flex: 'none', paddingBottom: 0 }}>
            <div className="segmented" role="tablist" aria-label="Modo di inserimento">
              <span aria-current="true">Manuale</span>
              <Link href={importHref}>Importa file</Link>
            </div>
          </div>
        )}

        {mine.length === 0 ? (
          <div className={sheet.scroll}>
            <p>
              Per aggiungere un movimento serve un conto (anche «Contanti»).{' '}
              <Link href="/conti" style={{ color: 'var(--accent)', fontWeight: 700 }}>
                Crea un conto
              </Link>
            </p>
          </div>
        ) : (
          <NewTransactionForm
            accounts={mine}
            categories={categories}
            usage={usage}
            today={todayInRome()}
            initialAccountId={initialAccountId}
            accountLocked={requested !== null}
            from={from}
          />
        )}
      </main>
    </div>
  );
}
