'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  changeAccountVisibility,
  createAccount,
  deleteAccount,
  getAccount,
  previewVisibilityChange,
  updateAccount,
} from '@/data/accounts';
import { returnPath, safeNextPath } from '@/domain/navigation/safe-next-path';
import {
  createAccountSchema,
  deleteAccountSchema,
  updateAccountSchema,
} from '@/domain/accounts/schemas';
import { changeVisibilitySchema, visibilityImpactMessage } from '@/domain/accounts/visibility';

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
  revalidatePath('/movimenti/importa'); // the import flow lists accounts too
  // A screen that wants to leave after creating says where; only a plain path
  // of this app is followed (the field is client-controlled).
  const next = safeNextPath(formData.get('next'));
  if (next) redirect(next);
  return { created: true };
}

export async function deleteAccountAction(formData: FormData) {
  const parsed = deleteAccountSchema.safeParse({ id: formData.get('id') });
  if (!parsed.success) redirect('/conti');

  await deleteAccount(parsed.data.id);
  revalidatePath('/conti');
  redirect('/conti');
}

export async function updateAccountAction(
  _prev: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const parsed = updateAccountSchema.safeParse({
    id: formData.get('id'),
    name: formData.get('name'),
    bankFormat: formData.get('bankFormat') ?? '',
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  // Who sees the account (ADR-015) is part of the same settings form. It is
  // validated before anything is written, and only acted on if it differs from
  // what the account is now.
  const current = await getAccount(parsed.data.id);
  if (!current || !current.canEdit) return { error: 'Il conto non è più disponibile.' };
  const visibility = formData.get('visibility');
  let visibilityChange: ReturnType<typeof changeVisibilitySchema.parse> | null = null;
  if (visibility !== null && visibility !== current.visibility) {
    const change = readVisibilityForm(formData);
    if (!change.success) return { error: change.error.issues[0]?.message };
    visibilityChange = change.data;
  }

  const result = await updateAccount(parsed.data);
  if (!result.ok) {
    return {
      error:
        result.code === 'duplicate'
          ? 'Hai già un conto con questo nome.'
          : result.code === 'cash_has_no_format'
            ? 'I contanti non hanno un file da importare.'
            : 'Non è stato possibile salvare il conto. Riprova.',
    };
  }
  if (visibilityChange) {
    // One database call: the account and the movements brought along change
    // together or not at all.
    const changed = await changeAccountVisibility(visibilityChange);
    if (!changed.ok) {
      return {
        error:
          'Nome e formato sono stati salvati, ma non è stato possibile cambiare la visibilità. Riprova.',
      };
    }
  }
  revalidatePath('/conti');
  revalidatePath(`/conti/${parsed.data.id}`);
  revalidatePath('/movimenti');
  revalidatePath('/movimenti/importa');
  revalidatePath('/riepilogo');
  redirect(returnPath(formData.get('da'), '/conti'));
}

export type VisibilityState = { error?: string; message?: string };

function readVisibilityForm(formData: FormData) {
  return changeVisibilitySchema.safeParse({
    id: formData.get('id'),
    visibility: formData.get('visibility'),
    scope: formData.get('scope'),
    fromDate: formData.get('fromDate') ?? '',
  });
}

// The preview: how many movements would change and who gains or loses the
// view, before anything is written.
export async function previewVisibilityAction(
  _prev: VisibilityState,
  formData: FormData,
): Promise<VisibilityState> {
  const parsed = readVisibilityForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const preview = await previewVisibilityChange(parsed.data);
  if (!preview) return { error: 'Non è stato possibile calcolare l’anteprima.' };
  return {
    message: visibilityImpactMessage({
      to: parsed.data.visibility,
      scope: parsed.data.scope,
      count: preview.count,
      others: preview.others,
    }),
  };
}
