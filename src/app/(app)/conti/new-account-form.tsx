'use client';

import { useActionState, useState } from 'react';
import {
  ACCOUNT_KIND_LABELS,
  ACCOUNT_VISIBILITY_LABELS,
  BANK_FORMAT_IDS,
  BANK_FORMAT_LABELS,
  type AccountKind,
} from '@/domain/accounts/schemas';
import { createAccountAction, type AccountFormState } from './actions';

export function NewAccountForm() {
  const [state, formAction, pending] = useActionState<AccountFormState, FormData>(
    createAccountAction,
    {},
  );
  const [kind, setKind] = useState<AccountKind>('bank');

  return (
    <form action={formAction} className="auth-form">
      <label htmlFor="name">Nome</label>
      <input id="name" name="name" maxLength={60} required />

      <label htmlFor="kind">Tipo</label>
      <select
        id="kind"
        name="kind"
        value={kind}
        onChange={(e) => setKind(e.target.value as AccountKind)}
      >
        {Object.entries(ACCOUNT_KIND_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      <label htmlFor="visibility">Chi vede i movimenti</label>
      <select id="visibility" name="visibility" defaultValue="private">
        {Object.entries(ACCOUNT_VISIBILITY_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      {/* Cash has no file to import, hence no format (ADR-025). */}
      {kind !== 'cash' && (
        <>
          <label htmlFor="bankFormat">Formato del file</label>
          <select id="bankFormat" name="bankFormat" defaultValue="">
            <option value="">Lo scelgo all’import</option>
            {BANK_FORMAT_IDS.map((id) => (
              <option key={id} value={id}>
                {BANK_FORMAT_LABELS[id]}
              </option>
            ))}
          </select>
        </>
      )}

      <p role="alert" aria-live="polite" className="auth-error">
        {state.error}
      </p>
      {state.created && <p>Conto creato.</p>}

      <button type="submit" disabled={pending}>
        {pending ? 'Attendi…' : 'Crea conto'}
      </button>
    </form>
  );
}
