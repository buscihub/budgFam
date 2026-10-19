'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getImportAccount, previewImport, runImport, undoImport } from '@/data/imports';
import { BANK_FORMAT_IDS, BANK_FORMAT_LABELS } from '@/domain/accounts/schemas';
import { returnPath } from '@/domain/navigation/safe-next-path';
import { prepareImport } from '@/domain/import/prepare';
import { getBankFormatPreset, type PresetId } from '@/domain/import/presets';
import type { HashedTransaction } from '@/domain/import/types';
import { z } from 'zod';

// Server Actions have a 1 MB request body by default (Next.js); a bank CSV is
// far smaller. The check is ours so the message is clear and in Italian.
const MAX_FILE_BYTES = 1_000_000;

export type ImportSampleRow = {
  bookedOn: string;
  description: string;
  amountCents: number;
  duplicate: boolean;
};

export type ImportFlowState = {
  error?: string;
  preview?: {
    accountId: string;
    formatId: string;
    fileName: string;
    fileSize: number;
    formatLabel: string;
    rowsRead: number;
    freshCount: number;
    duplicateCount: number;
    sample: ImportSampleRow[];
  };
};

const SAMPLE_ROWS = 8;

const uploadSchema = z.object({
  accountId: z.uuid({ error: 'Scegli il conto in cui importare.' }),
  formatId: z.preprocess(
    (v) => (v === '' ? null : v),
    z
      .enum(
        BANK_FORMAT_IDS.filter((id) => id !== 'auto'),
        { error: 'Scegli il formato del file.' },
      )
      .nullable(),
  ),
});

type Prepared =
  | { ok: true; accountId: string; formatId: PresetId; file: File; hashed: HashedTransaction[] }
  | { ok: false; error: string };

// Shared by "analyze" and "confirm": both re-read the same uploaded file and
// run the same pure chain, so the server never writes what it has not parsed
// itself (the preview on screen is a courtesy, not an input).
async function prepareUpload(formData: FormData): Promise<Prepared> {
  const parsed = uploadSchema.safeParse({
    accountId: formData.get('accountId'),
    formatId: formData.get('formatId') ?? '',
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]!.message };

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: 'Scegli il file dell’estratto conto.' };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, error: 'Il file è troppo grande (massimo 1 MB).' };
  }

  const account = await getImportAccount(parsed.data.accountId);
  if (!account) return { ok: false, error: 'Il conto scelto non è più disponibile.' };

  // The account's own format wins; the chip is only for accounts that left it
  // to "choose at import" (ADR-025/028).
  const accountPreset = getBankFormatPreset(account.bankFormat);
  const formatId = (accountPreset ? account.bankFormat : parsed.data.formatId) as PresetId | null;
  const format = formatId ? getBankFormatPreset(formatId) : null;
  if (!formatId || !format) return { ok: false, error: 'Scegli il formato del file.' };

  const text = new TextDecoder(format.encoding === 'latin1' ? 'windows-1252' : 'utf-8').decode(
    await file.arrayBuffer(),
  );
  const prepared = prepareImport(text, format, account.id);
  if (!prepared.ok) {
    return {
      ok: false,
      error: `Il file non corrisponde al formato ${BANK_FORMAT_LABELS[formatId]} (problema alla riga ${prepared.rowIndex + 1}). Controlla di aver scelto il conto e il file giusti.`,
    };
  }
  if (prepared.transactions.length === 0) {
    return { ok: false, error: 'Nel file non ci sono movimenti da importare.' };
  }
  return { ok: true, accountId: account.id, formatId, file, hashed: prepared.transactions };
}

export async function analyzeImportAction(
  _prev: ImportFlowState,
  formData: FormData,
): Promise<ImportFlowState> {
  const prepared = await prepareUpload(formData);
  if (!prepared.ok) return { error: prepared.error };

  const result = await previewImport(prepared.accountId, prepared.hashed);
  if (!result.ok) return { error: 'Non è stato possibile analizzare il file. Riprova.' };

  const duplicateHashes = new Set(result.duplicates.map((t) => t.importHash));
  return {
    preview: {
      accountId: prepared.accountId,
      formatId: prepared.formatId,
      fileName: prepared.file.name,
      fileSize: prepared.file.size,
      formatLabel: BANK_FORMAT_LABELS[prepared.formatId],
      rowsRead: result.rowsRead,
      freshCount: result.fresh.length,
      duplicateCount: result.duplicates.length,
      sample: prepared.hashed.slice(0, SAMPLE_ROWS).map((t) => ({
        bookedOn: t.bookedOn,
        description: t.description,
        amountCents: t.amountCents,
        duplicate: duplicateHashes.has(t.importHash),
      })),
    },
  };
}

export async function confirmImportAction(
  _prev: ImportFlowState,
  formData: FormData,
): Promise<ImportFlowState> {
  const prepared = await prepareUpload(formData);
  if (!prepared.ok) return { error: prepared.error };

  const result = await runImport({
    accountId: prepared.accountId,
    fileName: prepared.file.name.slice(0, 200),
    hashed: prepared.hashed,
  });
  if (!result.ok)
    return { error: 'L’import non è andato a buon fine. Non è stato salvato nulla: riprova.' };

  revalidatePath('/movimenti');
  revalidatePath('/riepilogo');
  revalidatePath('/conti', 'layout');
  redirect(
    `/movimenti/importa/${result.importId}?da=${encodeURIComponent(returnPath(formData.get('da')))}`,
  );
}

const undoSchema = z.object({ id: z.uuid() });

export async function undoImportAction(formData: FormData) {
  const parsed = undoSchema.safeParse({ id: formData.get('id') });
  const from = returnPath(formData.get('da'));
  if (!parsed.success) redirect(from);

  await undoImport(parsed.data.id);
  revalidatePath('/movimenti');
  revalidatePath('/riepilogo');
  revalidatePath('/conti', 'layout');
  redirect(`/movimenti/importa/${parsed.data.id}?da=${encodeURIComponent(from)}`);
}
