import Link from 'next/link';
import { listAccounts } from '@/data/accounts';
import { CloseIcon } from '../../../icons';
import sheet from '../../sheet-page.module.css';
import { ImportFlow } from './import-flow';

export const metadata = { title: 'Importa file · budgFam' };

export default async function ImportPage() {
  const { mine } = await listAccounts();
  // Cash has no file to import (ADR-025).
  const accounts = mine.filter((a) => a.kind !== 'cash');

  return (
    <div className={sheet.overlay}>
      <main className={`${sheet.panel} glass-sheet`}>
        <div className={sheet.header}>
          <Link href="/movimenti" className="glass-btn" aria-label="Chiudi">
            <CloseIcon />
          </Link>
          <h1 style={{ font: 'inherit' }}>Aggiungi movimento</h1>
          <span className={sheet.spacer} />
        </div>

        <div className={sheet.scroll} style={{ flex: 'none', paddingBottom: 0 }}>
          <div className="segmented" role="tablist" aria-label="Modo di inserimento">
            <Link href="/movimenti/nuovo">Manuale</Link>
            <span aria-current="true">Importa file</span>
          </div>
        </div>

        <ImportFlow accounts={accounts} />
      </main>
    </div>
  );
}
