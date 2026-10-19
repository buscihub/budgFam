import Link from 'next/link';
import { listAccounts } from '@/data/accounts';
import { getCategoryUsage, listCategories } from '@/data/categories';
import { todayInRome } from '@/domain/transactions/dates';
import { CloseIcon } from '../../../icons';
import sheet from '../../sheet-page.module.css';
import { NewTransactionForm } from './new-transaction-form';

export const metadata = { title: 'Nuovo movimento · budgFam' };

export default async function NewTransactionPage() {
  const [{ mine }, categories, usage] = await Promise.all([
    listAccounts(),
    listCategories(),
    getCategoryUsage(),
  ]);

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
            <span aria-current="true">Manuale</span>
            <Link href="/movimenti/importa">Importa file</Link>
          </div>
        </div>

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
          />
        )}
      </main>
    </div>
  );
}
