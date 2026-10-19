import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getImportSummary } from '@/data/imports';
import { z } from 'zod';
import { CloseIcon } from '../../../../icons';
import sheet from '../../../sheet-page.module.css';
import { undoImportAction } from '../actions';
import styles from '../importa.module.css';

export const metadata = { title: 'Esito import · budgFam' };

export default async function ImportResultPage({ params }: PageProps<'/movimenti/importa/[id]'>) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const summary = await getImportSummary(id);
  if (!summary) notFound();

  const undone = summary.status === 'undone';
  const failed = summary.status === 'failed';

  return (
    <div className={sheet.overlay}>
      <main className={`${sheet.panel} glass-sheet`}>
        <div className={sheet.header}>
          <Link href="/movimenti" className="glass-btn" aria-label="Chiudi">
            <CloseIcon />
          </Link>
          <h1 style={{ font: 'inherit' }}>Esito dell’import</h1>
          <span className={sheet.spacer} />
        </div>

        <div className={sheet.scroll}>
          <section className={`glass-card ${styles.result}`}>
            <h2>
              {failed
                ? 'Import non riuscito'
                : undone
                  ? 'Import annullato'
                  : `${summary.rowsInserted} movimenti importati`}
            </h2>
            <p>
              {summary.fileName}
              {summary.accountName && ` · ${summary.accountName}`}
            </p>
            <div className={styles.counters}>
              <div>
                <strong>{summary.rowsInserted}</strong>
                <span>{undone ? 'erano nuovi (rimossi)' : 'nuovi'}</span>
              </div>
              <div>
                <strong>{summary.rowsDuplicate}</strong>
                <span>già presenti</span>
              </div>
            </div>
            {undone && (
              <p className={styles.hint}>
                I movimenti di questo import sono stati cancellati. Puoi importare di nuovo lo
                stesso file.
              </p>
            )}
            {!undone && !failed && (
              <p className={styles.hint}>
                I movimenti sono senza categoria. Aprili da Movimenti per sceglierne una.
              </p>
            )}
          </section>
        </div>

        <div className={sheet.footer}>
          <Link href="/movimenti" className="btn-primary" style={{ padding: '15px 0' }}>
            Vai ai movimenti
          </Link>
          {summary.canUndo && (
            <form action={undoImportAction}>
              <input type="hidden" name="id" value={summary.id} />
              <button
                type="submit"
                className="glass-btn"
                style={{ padding: '12px 20px', width: '100%' }}
              >
                Annulla questo import
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
