'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import type { Account } from '@/data/accounts';
import type { Category } from '@/data/categories';
import { ACCOUNT_KIND_LABELS } from '@/domain/accounts/schemas';
import { pickTopCategories } from '@/domain/transactions/categories';
import { LockIcon, PlusIcon } from '../../../icons';
import { createTransactionAction, type TransactionFormState } from '../actions';
import { CategoryPicker } from '../category-picker';
import sheet from '../../sheet-page.module.css';
import styles from './nuovo.module.css';

export function NewTransactionForm({
  accounts,
  categories,
  usage,
  today,
  initialAccountId,
  accountLocked,
  from,
}: {
  accounts: Account[];
  categories: Category[];
  usage: Record<string, number>;
  today: string;
  // Preselected from the page the person came from; null = they must choose.
  initialAccountId: string | null;
  // Coming from an account page: the account is that one, not asked again.
  accountLocked: boolean;
  from: string;
}) {
  const [state, formAction, pending] = useActionState<TransactionFormState, FormData>(
    createTransactionAction,
    {},
  );
  const [accountId, setAccountId] = useState<string | null>(initialAccountId);
  const [direction, setDirection] = useState<'expense' | 'income'>('expense');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  // null = not touched: the switch follows the chosen account (ADR-015). Once
  // the person moves it, their choice stays whatever account they pick next.
  const [sharedChoice, setSharedChoice] = useState<boolean | null>(null);

  const account = accounts.find((a) => a.id === accountId) ?? null;
  const accountShared = account?.visibility === 'shared';
  const shared = sharedChoice ?? accountShared;

  const top = pickTopCategories(categories, usage, direction);
  const selected = categories.find((c) => c.id === categoryId);
  const chips = selected && !top.some((c) => c.id === selected.id) ? [...top, selected] : top;

  return (
    <form action={formAction} className={sheet.form}>
      <input type="hidden" name="da" value={from} />
      <div className={sheet.scroll}>
        {accountLocked && account ? (
          <div>
            <div className={styles.label}>Conto</div>
            <input type="hidden" name="accountId" value={account.id} />
            <p>
              <strong>{account.name}</strong> <small>{ACCOUNT_KIND_LABELS[account.kind]}</small>
            </p>
          </div>
        ) : (
          <div>
            <div className={styles.label}>Conto</div>
            <div className={styles.row}>
              {accounts.map((a) => (
                <label key={a.id} className="chip">
                  <input
                    type="radio"
                    name="accountId"
                    value={a.id}
                    checked={accountId === a.id}
                    onChange={() => setAccountId(a.id)}
                  />
                  {a.visibility === 'private' && <LockIcon size={11} />}
                  {a.name}
                  <small>{ACCOUNT_KIND_LABELS[a.kind]}</small>
                </label>
              ))}
              <Link href="/conti" className="chip chip-dashed">
                <PlusIcon size={12} /> Nuovo conto
              </Link>
            </div>
          </div>
        )}

        <div>
          <div className={styles.label}>Tipo</div>
          <div className="segmented">
            <label>
              <input
                type="radio"
                name="direction"
                value="expense"
                checked={direction === 'expense'}
                onChange={() => {
                  setDirection('expense');
                  setCategoryId(null);
                }}
              />
              Uscita
            </label>
            <label>
              <input
                type="radio"
                name="direction"
                value="income"
                checked={direction === 'income'}
                onChange={() => {
                  setDirection('income');
                  setCategoryId(null);
                }}
              />
              Entrata
            </label>
          </div>
        </div>

        <div>
          <label className={styles.label} htmlFor="amount" style={{ display: 'block' }}>
            Importo
          </label>
          <div className={`glass-field ${styles.amount}`}>
            <input id="amount" name="amount" inputMode="decimal" placeholder="0,00" required />
            <span aria-hidden="true">€</span>
          </div>
        </div>

        <div>
          <div className={styles.label}>Categoria</div>
          <input type="hidden" name="categoryId" value={categoryId ?? ''} />
          <div className={styles.wrap}>
            {chips.map((c) => (
              <button
                key={c.id}
                type="button"
                className="chip"
                aria-pressed={categoryId === c.id}
                onClick={() => setCategoryId(categoryId === c.id ? null : c.id)}
              >
                {c.name}
              </button>
            ))}
            <button type="button" className="chip chip-dashed" popoverTarget="category-sheet">
              Altro…
            </button>
          </div>
          <CategoryPicker
            id="category-sheet"
            categories={categories}
            value={categoryId}
            onSelect={setCategoryId}
            allowNone
          />
        </div>

        <div>
          <label className={styles.label} htmlFor="description" style={{ display: 'block' }}>
            Descrizione
          </label>
          <input
            id="description"
            name="description"
            maxLength={120}
            placeholder="Es. Caffè al bar"
            required
            className={`glass-field ${styles.field}`}
          />
        </div>

        <div>
          <label className={styles.label} htmlFor="bookedOn" style={{ display: 'block' }}>
            Data
          </label>
          <input
            id="bookedOn"
            name="bookedOn"
            type="date"
            defaultValue={today}
            required
            className={`glass-field ${styles.field}`}
          />
        </div>

        <label className={`glass-card ${styles.switchRow}`}>
          <span>
            <strong>Visibile alla famiglia</strong>
            <small>
              {sharedChoice === null
                ? `Segue il conto (${accountShared ? 'condiviso' : 'privato'}). Attivalo o spegnilo per decidere solo per questo movimento.`
                : 'Scelto a mano per questo movimento.'}
            </small>
          </span>
          <input
            type="checkbox"
            role="switch"
            className="switch"
            checked={shared}
            onChange={(e) => setSharedChoice(e.target.checked)}
          />
          <input type="hidden" name="visibility" value={shared ? 'shared' : 'private'} />
        </label>

        <p role="alert" aria-live="polite" className={styles.error}>
          {state.error}
        </p>
      </div>

      <div className={sheet.footer}>
        <button
          type="submit"
          className="btn-primary"
          style={{ padding: '15px 0' }}
          disabled={pending || !account}
        >
          {pending ? 'Attendi…' : 'Salva movimento'}
        </button>
        <Link href={from} className="glass-btn" style={{ padding: '0 20px' }}>
          Annulla
        </Link>
      </div>
    </form>
  );
}
