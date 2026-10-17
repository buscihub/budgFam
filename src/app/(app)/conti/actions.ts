'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createAccount, deleteAccount } from '@/data/accounts';
import { createAccountSchema, deleteAccountSchema } from '@/domain/accounts/schemas';

export type AccountFormState = { error?: string; created?: boolean };

export async function createAccountAction(
  _prev: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const parsed = createAccountSchema.safeParse({
    name: formData.get('name'),
    kind: formData.get('kind'),
    visibility: formData.get('visibility'),
    bankFormat: formData.get('bankFormat') ?? '',
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const result = await createAccount(parsed.data);
  if (!result.ok) {
    return {
      error:
        result.code === 'duplicate'
          ? 'Hai già un conto con questo nome.'
          : 'Non è stato possibile creare il conto. Riprova.',
    };
  }
  revalidatePath('/conti');
  return { created: true };
}

export async function deleteAccountAction(formData: FormData) {
  const parsed = deleteAccountSchema.safeParse({ id: formData.get('id') });
  if (!parsed.success) redirect('/conti');

  await deleteAccount(parsed.data.id);
  revalidatePath('/conti');
  redirect('/conti');
}
