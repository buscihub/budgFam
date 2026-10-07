'use server';

import { redirect } from 'next/navigation';
import { createHouseholdSchema } from '@/domain/household/schemas';
import { createHousehold } from '@/data/households';
import { requireUser } from '@/data/auth';

export type OnboardingFormState = { error?: string; householdName?: string; memberName?: string };

export async function createHouseholdAction(
  _prev: OnboardingFormState,
  formData: FormData,
): Promise<OnboardingFormState> {
  await requireUser();

  const householdName = String(formData.get('householdName') ?? '');
  const memberName = String(formData.get('memberName') ?? '');
  const parsed = createHouseholdSchema.safeParse({ householdName, memberName });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message, householdName, memberName };

  const result = await createHousehold(parsed.data.householdName, parsed.data.memberName);
  if (!result.ok) {
    const error =
      result.code === 'already_exists'
        ? 'Esiste già una famiglia su questa app: chiedi a chi l’ha creata di invitarti.'
        : 'Non è stato possibile creare la famiglia. Riprova.';
    return { error, householdName, memberName };
  }

  redirect('/');
}
