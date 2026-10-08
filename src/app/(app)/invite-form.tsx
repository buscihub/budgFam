'use client';

import { useActionState } from 'react';
import { createInviteAction, type InviteFormState } from './actions';

export function InviteForm() {
  const [state, formAction, pending] = useActionState<InviteFormState, FormData>(
    createInviteAction,
    {},
  );

  return (
    <form action={formAction} className="auth-form">
      <label htmlFor="role">Ruolo dell’invitato</label>
      <select id="role" name="role" defaultValue="member">
        <option value="member">Membro</option>
        <option value="admin">Amministratore</option>
      </select>

      <p role="alert" aria-live="polite" className="auth-error">
        {state.error}
      </p>

      {state.link && (
        <p>
          Link valido 24 ore, condividilo tu stesso:
          <br />
          <input readOnly value={state.link} onFocus={(e) => e.currentTarget.select()} />
        </p>
      )}

      <button type="submit" disabled={pending}>
        {pending ? 'Attendi…' : 'Genera invito'}
      </button>
    </form>
  );
}
