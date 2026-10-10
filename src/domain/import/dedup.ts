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
