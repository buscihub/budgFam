import { createHash } from 'node:crypto';
import type { HashedTransaction, NormalizedTransaction } from './types';

// Import dedup (DESIGN_DOC §8.3, ADR-009). Hashing uses node:crypto on purpose:
// the hash is only needed server-side, and it keeps this API synchronous. If the
// import preview ever needs it in the browser (task 1.5), swap it here only.
//
// The hash input format is a CONTRACT: hashes are persisted in
// transactions.import_hash, so changing the shape below makes every re-import
// recreate all movements. The "golden" test pins it.

// A bank id that is empty or whitespace-only counts as missing: the row falls
// back to the occurrence form instead of hashing "".
function bankId(tx: NormalizedTransaction): string | undefined {
  const id = tx.externalId?.trim();
  return id ? id : undefined;
}

// JSON of a tagged array: unambiguous (no "a|b" vs "ab|" concatenation clashes)
// and the tag keeps the two forms from ever colliding.
function sha256(parts: readonly (string | number)[]): string {
  return createHash('sha256').update(JSON.stringify(parts)).digest('hex');
}

// Rows come in file order. Rows with a bank id are identified by it. For the
// others, `n` counts how many identical rows (same date, amount, description)
// came before in this file, so two real coffees stay two movements while
// re-importing the same file yields the same hashes.
export function computeImportHashes(
  accountId: string,
  txs: NormalizedTransaction[],
): HashedTransaction[] {
  const seen = new Map<string, number>();
  return txs.map((tx) => {
    const id = bankId(tx);
    if (id !== undefined) {
      return { ...tx, importHash: sha256(['ext', accountId, id]) };
    }
    const key = JSON.stringify([tx.bookedOn, tx.amountCents, tx.description]);
    const n = seen.get(key) ?? 0;
    seen.set(key, n + 1);
    return {
      ...tx,
      importHash: sha256(['occ', accountId, tx.bookedOn, tx.amountCents, tx.description, n]),
    };
  });
}

// Splits a hashed file into rows to insert and rows already in the database
// (§8.3). `existingHashes` are the import_hash values already stored for this
// account. The occurrence index is part of the hash, so two identical coffees
// in one file are never marked duplicates of each other; they are duplicates
// only when a previous import already stored them. File order is preserved.
export function splitNewAndDuplicates(
  hashed: HashedTransaction[],
  existingHashes: ReadonlySet<string>,
): { fresh: HashedTransaction[]; duplicates: HashedTransaction[] } {
  const fresh: HashedTransaction[] = [];
  const duplicates: HashedTransaction[] = [];
  for (const tx of hashed) {
    (existingHashes.has(tx.importHash) ? duplicates : fresh).push(tx);
  }
  return { fresh, duplicates };
}
