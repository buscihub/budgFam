'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { returnPath, withMonthParam } from '@/domain/navigation/safe-next-path';
import { createManualTransaction, deleteTransaction, updateTransaction } from '@/data/transactions';
import {
  createManualTransactionSchema,
  deleteTransactionSchema,
  updateTransactionSchema,
} from '@/domain/transactions/schemas';

export type TransactionFormState = { error?: string };

export async function createTransactionAction(
  _prev: TransactionFormState,
  formData: FormData,
): Promise<TransactionFormState> {
  const parsed = createManualTransactionSchema.safeParse({
    accountId: formData.get('accountId'),
    direction: formData.get('direction'),
    amount: formData.get('amount'),
    categoryId: formData.get('categoryId') ?? '',
    description: formData.get('description'),
    bookedOn: formData.get('bookedOn'),
    visibility: formData.get('visibility') ?? '',
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const result = await createManualTransaction(parsed.data);
  if (!result.ok) {
    return {
      error:
        result.code === 'failed'
          ? 'Non è stato possibile salvare il movimento. Riprova.'
          : 'Il conto o la categoria scelti non sono più disponibili. Ricarica la pagina.',
    };
  }
  revalidatePath('/movimenti');
  revalidatePath('/riepilogo');
  revalidatePath('/conti', 'layout');
  // Back where the person came from, on the month of the movement just
  // added: a list showing another month would not contain it.
  redirect(withMonthParam(returnPath(formData.get('da')), parsed.data.bookedOn.slice(0, 7)));
}

export async function updateTransactionAction(
  _prev: TransactionFormState,
  formData: FormData,
): Promise<TransactionFormState> {
  const parsed = updateTransactionSchema.safeParse({
    id: formData.get('id'),
    categoryId: formData.get('categoryId') ?? '',
    note: formData.get('note') ?? '',
    visibility: formData.get('visibility') ?? undefined,
    followAccount: formData.get('followAccount'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const result = await updateTransaction(parsed.data);
  if (!result.ok) {
    return {
      error:
        result.code === 'failed'
          ? 'Non è stato possibile salvare le modifiche. Riprova.'
          : result.code === 'account_unavailable'
            ? 'Il conto non è più disponibile: scegli la visibilità a mano.'
            : 'Il movimento o la categoria non sono più disponibili. Ricarica la pagina.',
    };
  }
  revalidatePath('/movimenti');
  revalidatePath('/riepilogo');
  revalidatePath('/conti', 'layout');
  // Close the sheet and go back where the person came from. Staying on the
  // page would leave React 19's post-action form reset out of sync with the
  // controlled switch (it snaps back to the old value).
  redirect(returnPath(formData.get('da')));
}

export async function deleteTransactionAction(formData: FormData) {
  const parsed = deleteTransactionSchema.safeParse({ id: formData.get('id') });
  const from = returnPath(formData.get('da'));
  if (!parsed.success) redirect(from);

  await deleteTransaction(parsed.data.id);
  revalidatePath('/movimenti');
  revalidatePath('/riepilogo');
  revalidatePath('/conti', 'layout');
  redirect(from);
}
