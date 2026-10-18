'use client';

import { useActionState } from 'react';
import type { Category } from '@/data/categories';
import type { TransactionDetail } from '@/data/transactions';
import { NOTE_MAX_LENGTH, VISIBILITY_LABELS } from '@/domain/transactions/schemas';
import { updateTransactionAction, type TransactionFormState } from '../actions';

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

  return (
    <form action={formAction} className="auth-form">
      <input type="hidden" name="id" value={tx.id} />

      <label htmlFor="categoryId">Categoria</label>
      <select id="categoryId" name="categoryId" defaultValue={tx.categoryId ?? ''}>
        <option value="">Senza categoria</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>

      <label htmlFor="note">Nota</label>
      <textarea
        id="note"
        name="note"
        rows={3}
        maxLength={NOTE_MAX_LENGTH}
        defaultValue={tx.note ?? ''}
      />

      {/* Only the owner decides who sees a movement (ADR-015); for anyone else
          the current value is sent back unchanged, so nothing changes. */}
      {tx.isOwner ? (
        <>
          <label htmlFor="visibility">Chi lo vede</label>
          <select id="visibility" name="visibility" defaultValue={tx.visibility}>
            {Object.entries(VISIBILITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </>
      ) : (
        <>
          <input type="hidden" name="visibility" value={tx.visibility} />
          <p>Visibilità: {VISIBILITY_LABELS[tx.visibility]} (la sceglie chi l’ha registrato)</p>
        </>
      )}

      <p role="alert" aria-live="polite" className="auth-error">
        {state.error}
      </p>
      {state.saved && <p>Modifiche salvate.</p>}
      <button type="submit" disabled={pending}>
        {pending ? 'Attendi…' : 'Salva'}
      </button>
    </form>
  );
}
