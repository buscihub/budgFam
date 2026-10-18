import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDeletionImpact } from '@/data/accounts';
import { deleteAccountSchema } from '@/domain/accounts/schemas';
import { CloseIcon } from '../../../../icons';
import sheet from '../../../sheet-page.module.css';
import { deleteAccountAction } from '../../actions';

export const metadata = { title: 'Elimina conto · budgFam' };

// Confirmation page (ADR-033): says exactly what the delete will do, because
// it cannot be undone. A page instead of a client-side dialog keeps it working
// without JavaScript state and makes the numbers come from the server.
export default async function DeleteAccountPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!deleteAccountSchema.safeParse({ id }).success) notFound();

  const impact = await getDeletionImpact(id);
  if (!impact) notFound();
  const { account, privateTransactions, sharedTransactions } = impact;

  return (
    <div className={sheet.overlay}>
      <main className={`${sheet.panel} glass-sheet`}>
        <div className={sheet.header}>
          <Link href="/conti" className="glass-btn" aria-label="Chiudi">
            <CloseIcon />
          </Link>
          <h1 style={{ font: 'inherit' }}>Elimina «{account.name}»</h1>
          <span className={sheet.spacer} />
        </div>

        <div className={sheet.scroll}>
          <div className="glass-card" style={{ padding: '4px 16px' }}>
            <p
              style={{ padding: '12px 0', borderBottom: '1px solid var(--hairline)', fontSize: 14 }}
            >
              <strong>{privateTransactions}</strong> movimenti privati verranno{' '}
              <strong>cancellati</strong>.
            </p>
            <p style={{ padding: '12px 0', fontSize: 14 }}>
              <strong>{sharedTransactions}</strong> movimenti condivisi <strong>restano</strong> nei
              riepiloghi della famiglia, senza più un conto.
            </p>
          </div>
          <p style={{ fontSize: 14 }}>L’operazione non si può annullare.</p>
        </div>

        <form action={deleteAccountAction} className={sheet.footer}>
          <input type="hidden" name="id" value={account.id} />
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
            Elimina il conto
          </button>
          <Link href="/conti" className="glass-btn" style={{ padding: '0 20px' }}>
            Annulla
          </Link>
        </form>
      </main>
    </div>
  );
}
