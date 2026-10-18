'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createManualTransaction, deleteTransaction, updateTransaction } from '@/data/transactions';
import {
  createManualTransactionSchema,
  deleteTransactionSchema,
  updateTransactionSchema,
} from '@/domain/transactions/schemas';

export type TransactionFormState = { error?: string; saved?: boolean };

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
  redirect('/movimenti');
}

export async function updateTransactionAction(
  _prev: TransactionFormState,
  formData: FormData,
): Promise<TransactionFormState> {
  const parsed = updateTransactionSchema.safeParse({
    id: formData.get('id'),
    categoryId: formData.get('categoryId') ?? '',
    note: formData.get('note') ?? '',
    visibility: formData.get('visibility'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const result = await updateTransaction(parsed.data);
  if (!result.ok) {
    return {
      error:
        result.code === 'failed'
          ? 'Non è stato possibile salvare le modifiche. Riprova.'
          : 'Il movimento o la categoria non sono più disponibili. Ricarica la pagina.',
    };
  }
  revalidatePath('/movimenti');
  revalidatePath('/riepilogo');
  return { saved: true };
}

export async function deleteTransactionAction(formData: FormData) {
  const parsed = deleteTransactionSchema.safeParse({ id: formData.get('id') });
  if (!parsed.success) redirect('/movimenti');

  await deleteTransaction(parsed.data.id);
  revalidatePath('/movimenti');
  revalidatePath('/riepilogo');
  redirect('/movimenti');
}
