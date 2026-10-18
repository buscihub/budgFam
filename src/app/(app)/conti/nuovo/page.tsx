import Link from 'next/link';
import { CloseIcon } from '../../../icons';
import sheet from '../../sheet-page.module.css';
import { NewAccountForm } from '../new-account-form';

export const metadata = { title: 'Nuovo conto · budgFam' };

export default function NewAccountPage() {
  return (
    <div className={sheet.overlay}>
      <main className={`${sheet.panel} glass-sheet`}>
        <div className={sheet.header}>
          <Link href="/conti" className="glass-btn" aria-label="Chiudi">
            <CloseIcon />
          </Link>
          <h1 style={{ font: 'inherit' }}>Nuovo conto</h1>
          <span className={sheet.spacer} />
        </div>
        <NewAccountForm next="/conti" />
      </main>
    </div>
  );
}
