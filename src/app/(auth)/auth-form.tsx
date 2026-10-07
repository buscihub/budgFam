'use client';

import { useActionState } from 'react';
import type { AuthFormState } from './actions';

type Props = {
  action: (prev: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  submitLabel: string;
  passwordAutoComplete: 'current-password' | 'new-password';
};

export function AuthForm({ action, submitLabel, passwordAutoComplete }: Props) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="auth-form">
      <label htmlFor="email">Email</label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        defaultValue={state.email}
        required
      />

      <label htmlFor="password">Password</label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete={passwordAutoComplete}
        required
      />

      <p role="alert" aria-live="polite" className="auth-error">
        {state.error}
      </p>

      <button type="submit" disabled={pending}>
        {pending ? 'Attendi…' : submitLabel}
      </button>
    </form>
  );
}
