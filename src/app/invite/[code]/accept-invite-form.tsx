'use client';

import { useActionState } from 'react';
import { acceptInviteAction, type AcceptInviteFormState } from './actions';

export function AcceptInviteForm({ code }: { code: string }) {
  const [state, formAction, pending] = useActionState<AcceptInviteFormState, FormData>(
    acceptInviteAction,
    {},
  );

  return (
    <form action={formAction} className="auth-form">
      <input type="hidden" name="code" value={code} />

      <label htmlFor="memberName">Il tuo nome</label>
      <input
        id="memberName"
        name="memberName"
        defaultValue={state.memberName}
        maxLength={40}
        required
      />

      <p role="alert" aria-live="polite" className="auth-error">
        {state.error}
      </p>

      <button type="submit" disabled={pending}>
        {pending ? 'Attendi…' : 'Entra nella famiglia'}
      </button>
    </form>
  );
}
