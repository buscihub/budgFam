'use client';

import { useActionState, useState } from 'react';
import {
  ACCOUNT_KIND_LABELS,
  ACCOUNT_VISIBILITY_LABELS,
  BANK_FORMAT_IDS,
  BANK_FORMAT_LABELS,
  type AccountKind,
} from '@/domain/accounts/schemas';
import { LockIcon } from '../../icons';
import sheet from '../sheet-page.module.css';
import { createAccountAction, type AccountFormState } from './actions';
import styles from './new-account-form.module.css';

const VISIBILITY_HINTS = {
  private: 'Lo vedi solo tu, con i suoi movimenti.',
  shared: 'La famiglia vede conto e movimenti, anche se lo usi solo tu.',
} as const;

// `next`: where to go after creating. The import flow (task 1.5) reuses this
// form without it and stays on its own screen, reading `state.created`.
export function NewAccountForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState<AccountFormState, FormData>(
    createAccountAction,
    {},
  );
  const [kind, setKind] = useState<AccountKind>('bank');

  return (
    <form action={formAction} className={sheet.form}>
      {next && <input type="hidden" name="next" value={next} />}

      <div className={sheet.scroll}>
        <div>
          <label className={styles.label} htmlFor="name" style={{ display: 'block' }}>
            Nome
          </label>
          <input
            id="name"
            name="name"
            maxLength={60}
            required
            placeholder="Es. Revolut di Federico"
            className={`glass-field ${styles.field}`}
          />
        </div>

        <div>
          <div className={styles.label}>Tipo</div>
          <div className="segmented">
            {Object.entries(ACCOUNT_KIND_LABELS).map(([value, label]) => (
              <label key={value}>
                <input
                  type="radio"
                  name="kind"
                  value={value}
                  checked={kind === value}
                  onChange={() => setKind(value as AccountKind)}
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <div className={styles.label}>Chi lo vede</div>
          <div className={styles.cards}>
            {(
              Object.keys(ACCOUNT_VISIBILITY_LABELS) as (keyof typeof ACCOUNT_VISIBILITY_LABELS)[]
            ).map((value) => (
              <label key={value} className={`glass-card ${styles.card}`}>
                <input
                  type="radio"
                  name="visibility"
                  value={value}
                  defaultChecked={value === 'private'}
                />
                <span className={styles.radio} />
                <span>
                  <strong>
                    {value === 'private' && <LockIcon size={12} />}
                    {value === 'private' ? 'Privato' : 'Condiviso'}
                  </strong>
                  <small>{VISIBILITY_HINTS[value]}</small>
                </span>
              </label>
            ))}
          </div>
          <p className={styles.hint} style={{ marginTop: 8 }}>
            Ogni movimento può comunque avere una visibilità sua.
          </p>
        </div>

        {/* Cash has no file to import, hence no format (ADR-025). */}
        {kind !== 'cash' && (
          <div>
            <div className={styles.label}>Formato del file</div>
            <div className={styles.chips}>
              <label className="chip">
                <input type="radio" name="bankFormat" value="" defaultChecked />
                Lo scelgo all’import
              </label>
              {BANK_FORMAT_IDS.map((id) => (
                <label key={id} className="chip">
                  <input type="radio" name="bankFormat" value={id} />
                  {BANK_FORMAT_LABELS[id]}
                </label>
              ))}
            </div>
            <p className={styles.hint} style={{ marginTop: 8 }}>
              Altre banche in arrivo: poi riconosceremo il formato da soli.
            </p>
          </div>
        )}

        <p role="alert" aria-live="polite" className={styles.error}>
          {state.error}
        </p>
        {state.created && !next && <p>Conto creato.</p>}
      </div>

      <div className={sheet.footer}>
        <button
          type="submit"
          className="btn-primary"
          style={{ padding: '15px 0' }}
          disabled={pending}
        >
          {pending ? 'Attendi…' : 'Crea conto'}
        </button>
      </div>
    </form>
  );
}
