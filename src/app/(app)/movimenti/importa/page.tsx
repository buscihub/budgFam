import Link from 'next/link';
import { redirect } from 'next/navigation';
import { listAccounts } from '@/data/accounts';
import { returnPath } from '@/domain/navigation/safe-next-path';
import { CloseIcon } from '../../../icons';
import sheet from '../../sheet-page.module.css';
import { ImportFlow } from './import-flow';

export const metadata = { title: 'Importa file · budgFam' };

export default async function ImportPage({ searchParams }: PageProps<'/movimenti/importa'>) {
  const params = await searchParams;
  const from = returnPath(params.da);
  const { mine } = await listAccounts();
  // Cash has no file to import (ADR-025).
  const accounts = mine.filter((a) => a.kind !== 'cash');
  const wanted = typeof params.conto === 'string' ? params.conto : undefined;
  // A cash account has nothing to import: send the person to the manual entry
  // for that same account instead of showing a file form.
  if (mine.some((a) => a.id === wanted && a.kind === 'cash')) {
    redirect(`/movimenti/nuovo?da=${encodeURIComponent(from)}&conto=${wanted}`);
  }
  const requested = accounts.find((a) => a.id === wanted)?.id ?? null;
  const initialAccountId = requested ?? (accounts.length === 1 ? accounts[0]!.id : null);
  const manualHref = `/movimenti/nuovo?da=${encodeURIComponent(from)}${
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

        <div className={sheet.scroll} style={{ flex: 'none', paddingBottom: 0 }}>
          <div className="segmented" role="tablist" aria-label="Modo di inserimento">
            <Link href={manualHref}>Manuale</Link>
            <span aria-current="true">Importa file</span>
          </div>
        </div>

        <ImportFlow
          accounts={accounts}
          initialAccountId={initialAccountId}
          accountLocked={requested !== null}
          from={from}
        />
      </main>
    </div>
  );
}
