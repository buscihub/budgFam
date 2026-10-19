import { computeImportHashes } from './dedup';
import { normalizeTransactions } from './normalize';
import { parseBankCsv } from './parse';
import type { BankFormat, HashedTransaction } from './types';

export type PreparedImport =
  | { ok: true; transactions: HashedTransaction[]; skippedRows: number }
  | { ok: false; error: string; rowIndex: number };

// The whole file-to-rows chain (parse → normalize → hash), pure. The preview
// and the confirm step both call this on the uploaded text, so what the person
// sees is exactly what gets written (the server never trusts the preview).
export function prepareImport(
  csvText: string,
  format: BankFormat,
  accountId: string,
): PreparedImport {
  const parsed = parseBankCsv(csvText, format);
  if (!parsed.ok) return parsed;
  return {
    ok: true,
    transactions: computeImportHashes(accountId, normalizeTransactions(parsed.transactions)),
    skippedRows: parsed.skippedRows,
  };
}
