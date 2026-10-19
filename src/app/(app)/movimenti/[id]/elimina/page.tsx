import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTransaction } from '@/data/transactions';
import { returnPath } from '@/domain/navigation/safe-next-path';
import { formatSignedCents } from '@/domain/budget/format-currency';
import { humanizeDescription } from '@/domain/transactions/display';
import { deleteTransactionSchema } from '@/domain/transactions/schemas';
import { CloseIcon } from '../../../../icons';
import { deleteTransactionAction } from '../../actions';
import sheet from '../../../sheet-page.module.css';

export const metadata = { title: 'Elimina movimento · budgFam' };

// Confirmation page, same pattern as deleting an account: a delete cannot be undone.
export default async function DeleteTransactionPage({
  params,
  searchParams,
}: PageProps<'/movimenti/[id]/elimina'>) {
  const { id } = await params;
  const from = returnPath((await searchParams).da);
  const detailHref = `/movimenti/${id}?da=${encodeURIComponent(from)}`;
  if (!deleteTransactionSchema.safeParse({ id }).success) notFound();

  const tx = await getTransaction(id);
  if (!tx || !tx.canDelete) notFound();

  return (
    <div className={sheet.overlay}>
      <main className={`${sheet.panel} glass-sheet`}>
        <div className={sheet.header}>
          <Link href={detailHref} className="glass-btn" aria-label="Chiudi">
            <CloseIcon />
          </Link>
          <h1 style={{ font: 'inherit' }}>Elimina il movimento</h1>
          <span className={sheet.spacer} />
        </div>

        <div className={sheet.scroll}>
          <div className="glass-card" style={{ padding: 16 }}>
            <p style={{ fontWeight: 700 }}>{humanizeDescription(tx.description)}</p>
            <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>
              {formatSignedCents(tx.amountCents)} · {tx.accountName ?? 'conto non disponibile'}
            </p>
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.45 }}>
            Il movimento sparirà dai riepiloghi. L’operazione non si può annullare.
          </p>
        </div>

        <form action={deleteTransactionAction} className={sheet.footer}>
          <input type="hidden" name="id" value={tx.id} />
          <input type="hidden" name="da" value={from} />
          <button
            type="submit"
            className="btn-primary"
            style={{
              padding: '15px 0',
              background: 'var(--danger)',
              boxShadow: 'none',
              color: 'var(--bg-solid)',
            }}
          >
            Elimina
          </button>
          <Link href={detailHref} className="glass-btn" style={{ padding: '0 20px' }}>
            Annulla
          </Link>
        </form>
      </main>
    </div>
  );
}
