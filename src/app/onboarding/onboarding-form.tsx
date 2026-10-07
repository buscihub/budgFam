'use client';

import { useActionState } from 'react';
import { createHouseholdAction, type OnboardingFormState } from './actions';

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState<OnboardingFormState, FormData>(
    createHouseholdAction,
    {},
  );

  return (
    <form action={formAction} className="auth-form">
      <label htmlFor="householdName">Nome della famiglia</label>
      <input
        id="householdName"
        name="householdName"
        defaultValue={state.householdName}
        maxLength={60}
        required
      />

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
        {pending ? 'Attendi…' : 'Crea la famiglia'}
      </button>
    </form>
  );
}
