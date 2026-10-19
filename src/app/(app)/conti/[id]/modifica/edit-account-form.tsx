'use client';

import Link from 'next/link';
import { startTransition, useActionState, useEffect, useState } from 'react';
import type { AccountDetail } from '@/data/accounts';
import {
  ACCOUNT_KIND_LABELS,
  ACCOUNT_VISIBILITY_LABELS,
  BANK_FORMAT_IDS,
  BANK_FORMAT_LABELS,
} from '@/domain/accounts/schemas';
import {
  VISIBILITY_SCOPES,
  VISIBILITY_SCOPE_LABELS,
  type VisibilityScope,
} from '@/domain/accounts/visibility';
import { LockIcon } from '../../../../icons';
import sheet from '../../../sheet-page.module.css';
import styles from '../../new-account-form.module.css';
import {
  previewVisibilityAction,
  updateAccountAction,
  type AccountFormState,
  type VisibilityState,
} from '../../actions';

type Visibility = AccountDetail['visibility'];

export function EditAccountForm({
  account,
  today,
  from,
}: {
  account: AccountDetail;
  today: string;
  from: string;
}) {
  const [state, formAction, pending] = useActionState<AccountFormState, FormData>(
    updateAccountAction,
    {},
  );
  const [preview, previewAction, previewing] = useActionState<VisibilityState, FormData>(
    previewVisibilityAction,
    {},
  );

  // Controlled on purpose, and sent by hand: React 19 resets a form after an
  // action, which would wipe what the person typed when the save is refused.
  const [name, setName] = useState(account.name);
  const [bankFormat, setBankFormat] = useState(account.bankFormat ?? '');
  const [visibility, setVisibility] = useState<Visibility>(account.visibility);
  const [scope, setScope] = useState<VisibilityScope>('now');
  const [fromDate, setFromDate] = useState(today);
  const visibilityChanged = visibility !== account.visibility;

  const visibilityData = () => {
    const data = new FormData();
    data.set('id', account.id);
    data.set('visibility', visibility);
    data.set('scope', scope);
    data.set('fromDate', scope === 'from_date' ? fromDate : '');
    return data;
  };

  // The preview follows the choice: how many movements change, and for whom.
  useEffect(() => {
    if (!visibilityChanged) return;
    const data = new FormData();
    data.set('id', account.id);
    data.set('visibility', visibility);
    data.set('scope', scope);
    data.set('fromDate', scope === 'from_date' ? fromDate : '');
    startTransition(() => previewAction(data));
  }, [account.id, visibility, visibilityChanged, scope, fromDate, previewAction]);

  function save() {
    const data = visibilityData();
    data.set('name', name);
    data.set('bankFormat', bankFormat);
    data.set('da', from);
    startTransition(() => formAction(data));
  }

  return (
    <form
      className={sheet.form}
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <div className={sheet.scroll}>
        <div>
          <label className={styles.label} htmlFor="name" style={{ display: 'block' }}>
            Nome
          </label>
          <input
            id="name"
            maxLength={60}
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`glass-field ${styles.field}`}
          />
        </div>

        {account.kind !== 'cash' && (
          <div>
            <div className={styles.label}>Formato del file</div>
            <div className={styles.chips}>
              <label className="chip">
                <input
                  type="radio"
                  name="bankFormat"
                  value=""
                  checked={bankFormat === ''}
                  onChange={() => setBankFormat('')}
                />
                Lo scelgo all’import
              </label>
              {BANK_FORMAT_IDS.map((id) => (
                <label key={id} className="chip">
                  <input
                    type="radio"
                    name="bankFormat"
                    value={id}
                    checked={bankFormat === id}
                    onChange={() => setBankFormat(id)}
                  />
                  {BANK_FORMAT_LABELS[id]}
                </label>
              ))}
            </div>
            <p className={styles.hint} style={{ marginTop: 8 }}>
              Il formato nuovo vale dal prossimo import; i movimenti già importati non cambiano.
            </p>
          </div>
        )}

        <div>
          <div className={styles.label}>Chi vede il conto</div>
          <div className={styles.chips}>
            {(Object.keys(ACCOUNT_VISIBILITY_LABELS) as Visibility[]).map((value) => (
              <label key={value} className="chip">
                <input
                  type="radio"
                  name="visibility"
                  value={value}
                  checked={visibility === value}
                  onChange={() => setVisibility(value)}
                />
                {value === 'private' && <LockIcon size={11} />}
                {ACCOUNT_VISIBILITY_LABELS[value]}
              </label>
            ))}
          </div>

          {visibilityChanged && (
            <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
              <div className={styles.label} style={{ marginBottom: 0 }}>
                Cosa fare dei movimenti già presenti
              </div>
              <div className={styles.chips}>
                {VISIBILITY_SCOPES.map((value) => (
                  <label key={value} className="chip">
                    <input
                      type="radio"
                      name="scope"
                      value={value}
                      checked={scope === value}
                      onChange={() => setScope(value)}
                    />
                    {VISIBILITY_SCOPE_LABELS[value]}
                  </label>
                ))}
              </div>
              {scope === 'from_date' && (
                <input
                  type="date"
                  value={fromDate}
                  max={today}
                  onChange={(e) => setFromDate(e.target.value)}
                  className={`glass-field ${styles.field}`}
                  aria-label="Da quale data"
                />
              )}
              <p
                role="status"
                aria-live="polite"
                className="glass-card"
                style={{ padding: 14, fontSize: 14, opacity: previewing ? 0.6 : 1 }}
              >
                {preview.error ?? preview.message ?? 'Calcolo l’anteprima…'}
              </p>
              <p className={styles.hint}>
                I movimenti per cui hai scelto la visibilità a mano non cambiano mai.
              </p>
            </div>
          )}
          <p className={styles.hint} style={{ marginTop: 8 }}>
            Il tipo ({ACCOUNT_KIND_LABELS[account.kind]}) non si cambia dopo la creazione.
          </p>
        </div>

        <p role="alert" aria-live="polite" className={styles.error}>
          {state.error}
        </p>

        <Link href={`/conti/${account.id}/elimina`} style={{ color: 'var(--danger, #c0392b)' }}>
          Elimina il conto…
        </Link>
      </div>

      <div className={sheet.footer}>
        <button
          type="submit"
          className="btn-primary"
          style={{ padding: '15px 0' }}
          disabled={pending || (visibilityChanged && (previewing || Boolean(preview.error)))}
        >
          {pending ? 'Attendi…' : 'Salva'}
        </button>
        <Link href={from} className="glass-btn" style={{ padding: '0 20px' }}>
          Annulla
        </Link>
      </div>
    </form>
  );
}
