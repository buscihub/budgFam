'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import type { Category } from '@/data/categories';
import type { TransactionDetail } from '@/data/transactions';
import { NOTE_MAX_LENGTH, VISIBILITY_LABELS } from '@/domain/transactions/schemas';
import { ChevronRightIcon } from '../../../icons';
import { updateTransactionAction, type TransactionFormState } from '../actions';
import { CategoryPicker } from '../category-picker';
import sheet from '../../sheet-page.module.css';
import styles from './dettaglio.module.css';

const VISIBILITY_WORD = { private: 'privato', shared: 'condiviso' } as const;

// What the visibility switch tells the person, following the mockups' wording.
function visibilityHint(tx: TransactionDetail, shared: boolean): string {
  const account = tx.accountVisibility;
  if (!account) return 'Il conto non è più disponibile: la visibilità si sceglie a mano.';
  if (!tx.visibilityOverridden && (shared ? 'shared' : 'private') === account) {
    return account === 'shared'
      ? 'Segue il conto (condiviso). Spegnilo per tenere privato solo questo movimento.'
      : 'Segue il conto (privato). Attivalo per condividere solo questo movimento.';
  }
  if ((shared ? 'shared' : 'private') === account) return 'Scelto a mano, come il conto.';
  return shared
    ? `Il conto è ${VISIBILITY_WORD[account]}, ma questo movimento è visibile alla famiglia.`
    : `Il conto è ${VISIBILITY_WORD[account]}, ma questo movimento lo vedi solo tu.`;
}

export function EditTransactionForm({
  tx,
  categories,
}: {
  tx: TransactionDetail;
  categories: Category[];
}) {
  const [state, formAction, pending] = useActionState<TransactionFormState, FormData>(
    updateTransactionAction,
    {},
  );
  const [categoryId, setCategoryId] = useState(tx.categoryId);
  const [shared, setShared] = useState(tx.visibility === 'shared');
  const categoryName = categories.find((c) => c.id === categoryId)?.name;

  return (
    <form action={formAction} className={sheet.form}>
      <input type="hidden" name="id" value={tx.id} />
      <input type="hidden" name="categoryId" value={categoryId ?? ''} />
      {tx.isOwner && (
        <input type="hidden" name="visibility" value={shared ? 'shared' : 'private'} />
      )}

      <div className={sheet.scroll}>
        <div className={`glass-card ${styles.rows}`}>
          <button type="button" className={styles.line} popoverTarget="category-sheet">
            <span className={styles.key}>Categoria</span>
            <span className={styles.value}>
              {categoryName ? (
                <span className="pill pill-accent">{categoryName}</span>
              ) : (
                <span style={{ color: 'var(--placeholder)', fontWeight: 500 }}>Scegli</span>
              )}
            </span>
            <ChevronRightIcon />
          </button>
          <label className={`${styles.line} ${styles.noteLine}`}>
            <span className={styles.key}>Nota</span>
            <textarea
              name="note"
              rows={2}
              maxLength={NOTE_MAX_LENGTH}
              placeholder="Aggiungi una nota"
              defaultValue={tx.note ?? ''}
              className={styles.note}
            />
          </label>
        </div>

        <CategoryPicker
          id="category-sheet"
          categories={categories}
          value={categoryId}
          onSelect={setCategoryId}
          allowNone
        />

        {/* Only the owner decides who sees a movement (ADR-015); anyone else
            just reads it. */}
        {tx.isOwner ? (
          <div className="glass-card">
            <label className={styles.switchRow}>
              <span>
                <strong>Visibile alla famiglia</strong>
                <small>{visibilityHint(tx, shared)}</small>
              </span>
              <input
                type="checkbox"
                role="switch"
                className="switch"
                checked={shared}
                onChange={(e) => setShared(e.target.checked)}
              />
            </label>
            {tx.accountVisibility && tx.visibilityOverridden && (
              <button type="submit" name="followAccount" value="1" className={styles.follow}>
                Torna a seguire il conto
              </button>
            )}
            {tx.visibilityOverridden && (
              <p className={styles.info}>
                I movimenti che imposti a mano non cambiano più quando cambi la visibilità del
                conto.
              </p>
            )}
          </div>
        ) : (
          <p className={styles.info} style={{ padding: 0 }}>
            Visibilità: {VISIBILITY_LABELS[tx.visibility]} (la sceglie chi l’ha registrato).
          </p>
        )}

        <p role="alert" aria-live="polite" className={styles.error}>
          {state.error}
        </p>
        {state.saved && <p className={styles.saved}>Modifiche salvate.</p>}
      </div>

      <div className={sheet.footer}>
        <button
          type="submit"
          className="btn-primary"
          style={{ padding: '15px 0' }}
          disabled={pending}
        >
          {pending ? 'Attendi…' : 'Salva'}
        </button>
        {tx.canDelete && (
          <Link href={`/movimenti/${tx.id}/elimina`} className={styles.danger}>
            Elimina movimento
          </Link>
        )}
      </div>
    </form>
  );
}
