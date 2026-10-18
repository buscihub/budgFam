'use client';

import { useActionState } from 'react';
import type { Account } from '@/data/accounts';
import type { Category } from '@/data/categories';
import { VISIBILITY_LABELS } from '@/domain/transactions/schemas';
import { createTransactionAction, type TransactionFormState } from '../actions';

export function NewTransactionForm({
  accounts,
  categories,
  today,
}: {
  accounts: Account[];
  categories: Category[];
  today: string;
}) {
  const [state, formAction, pending] = useActionState<TransactionFormState, FormData>(
    createTransactionAction,
    {},
  );

  return (
    <form action={formAction} className="auth-form">
      <label htmlFor="accountId">Conto</label>
      <select id="accountId" name="accountId" required>
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {account.name}
          </option>
        ))}
      </select>

      <fieldset>
        <legend>Tipo</legend>
        <label>
          <input type="radio" name="direction" value="expense" defaultChecked /> Uscita
        </label>{' '}
        <label>
          <input type="radio" name="direction" value="income" /> Entrata
        </label>
      </fieldset>

      <label htmlFor="amount">Importo (€)</label>
      <input id="amount" name="amount" inputMode="decimal" placeholder="12,50" required />

      <label htmlFor="categoryId">Categoria</label>
      <select id="categoryId" name="categoryId" defaultValue="">
        <option value="">Senza categoria</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>

      <label htmlFor="description">Descrizione</label>
      <input id="description" name="description" maxLength={120} required />

      <label htmlFor="bookedOn">Data</label>
      <input id="bookedOn" name="bookedOn" type="date" defaultValue={today} required />

      <label htmlFor="visibility">Chi lo vede</label>
      <select id="visibility" name="visibility" defaultValue="">
        <option value="">Come il conto</option>
        {Object.entries(VISIBILITY_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      <p role="alert" aria-live="polite" className="auth-error">
        {state.error}
      </p>
      <button type="submit" disabled={pending}>
        {pending ? 'Attendi…' : 'Salva movimento'}
      </button>
    </form>
  );
}
