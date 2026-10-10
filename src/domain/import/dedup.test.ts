import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { computeImportHashes } from './dedup';
import { normalizeTransactions } from './normalize';
import { parseBankCsv } from './parse';
import type { BankFormat, NormalizedTransaction } from './types';

const A = 'account-a';
const B = 'account-b';

function tx(over: Partial<NormalizedTransaction> = {}): NormalizedTransaction {
  return { bookedOn: '2025-01-10', description: 'BAR ROMA', amountCents: -120, ...over };
}

const hashes = (account: string, txs: NormalizedTransaction[]) =>
  computeImportHashes(account, txs).map((t) => t.importHash);

describe('computeImportHashes — occurrence index (no bank id)', () => {
  it('keeps two identical coffees as two movements', () => {
    const [h1, h2] = hashes(A, [tx(), tx()]);
    expect(h1).not.toBe(h2);
  });

  it('gives three identical rows three distinct hashes', () => {
    expect(new Set(hashes(A, [tx(), tx(), tx()])).size).toBe(3);
  });

  it('re-importing the same file yields the same hashes in the same order', () => {
    const file = [tx(), tx(), tx({ amountCents: -500 })];
    expect(hashes(A, file)).toEqual(hashes(A, file));
  });

  it('does not mutate the input and keeps the order and fields', () => {
    const file = [tx(), tx({ amountCents: -500 })];
    const copy = structuredClone(file);
    const out = computeImportHashes(A, file);
    expect(file).toEqual(copy);
    expect(out.map((t) => t.description)).toEqual(file.map((t) => t.description));
    expect(out.map((t) => t.amountCents)).toEqual(file.map((t) => t.amountCents));
  });

  it.each([
    ['date', { bookedOn: '2025-01-11' }],
    ['amount', { amountCents: -121 }],
    ['description', { description: 'BAR MILANO' }],
  ])('changes when the %s changes', (_name, over) => {
    expect(hashes(A, [tx()])[0]).not.toBe(hashes(A, [tx(over)])[0]);
  });

  it('does not collide across accounts', () => {
    expect(hashes(A, [tx()])[0]).not.toBe(hashes(B, [tx()])[0]);
  });

  it('does not confuse fields that would clash if concatenated', () => {
    const x = hashes(A, [tx({ description: '1 2', amountCents: 3 })])[0];
    const y = hashes(A, [tx({ description: '1', amountCents: 23 })])[0];
    expect(x).not.toBe(y);
  });

  it('known limit (§8.3): a statement that starts between two identical rows', () => {
    // Two real, identical coffees C1 and C2 on the same day.
    const statement1 = [tx()]; // ends right after C1: [C1]
    const statement2 = [tx()]; // starts right at C2:  [C2]
    // C2 is occurrence 0 of its own file, so it gets C1's hash and the unique
    // constraint would wrongly drop it. Documented, not fixed: it only affects
    // banks without a bank id.
    expect(hashes(A, statement2)[0]).toBe(hashes(A, statement1)[0]);

    // When the second statement also contains C1, the indexes line up.
    const overlapping = hashes(A, [tx(), tx()]); // [C1, C2]
    expect(overlapping[0]).toBe(hashes(A, statement1)[0]); // C1 deduplicated
    expect(overlapping[1]).not.toBe(overlapping[0]); // C2 kept
  });
});

describe('computeImportHashes — bank id', () => {
  it('depends only on account and id, not on date, amount, description or position', () => {
    const a = hashes(A, [tx({ externalId: 'id-1' })])[0];
    const b = hashes(A, [
      tx({ amountCents: -1 }),
      tx({ externalId: 'id-1', bookedOn: '2030-01-01', description: 'X', amountCents: 999 }),
    ])[1];
    expect(a).toBe(b);
  });

  it('does not collide across accounts or ids', () => {
    expect(hashes(A, [tx({ externalId: 'id-1' })])[0]).not.toBe(
      hashes(B, [tx({ externalId: 'id-1' })])[0],
    );
    expect(hashes(A, [tx({ externalId: 'id-1' })])[0]).not.toBe(
      hashes(A, [tx({ externalId: 'id-2' })])[0],
    );
  });

  it('makes overlapping statements safe: identical rows with ids stay distinct', () => {
    const statement1 = [tx({ externalId: 'id-1' }), tx({ externalId: 'id-2' })];
    const statement2 = [tx({ externalId: 'id-2' })];
    expect(hashes(A, statement2)[0]).toBe(hashes(A, statement1)[1]);
    expect(hashes(A, statement2)[0]).not.toBe(hashes(A, statement1)[0]);
  });

  it('falls back to the occurrence form when the id is empty or blank', () => {
    expect(hashes(A, [tx({ externalId: '' })])).toEqual(hashes(A, [tx()]));
    expect(hashes(A, [tx({ externalId: '   ' })])).toEqual(hashes(A, [tx()]));
  });

  it('does not let rows with an id consume occurrence indexes', () => {
    const withId = hashes(A, [tx({ externalId: 'id-1' }), tx()]);
    expect(withId[1]).toBe(hashes(A, [tx()])[0]);
  });

  it('gives the same hash to a repeated id in the same file (the unique constraint drops it)', () => {
    const [h1, h2] = hashes(A, [tx({ externalId: 'id-1' }), tx({ externalId: 'id-1' })]);
    expect(h1).toBe(h2);
  });
});

describe('computeImportHashes — persisted format (golden)', () => {
  // If these change, every already-imported movement would be re-created.
  it('pins both hash forms', () => {
    expect(hashes('acc', [tx({ externalId: 'id-1' })])[0]).toBe(
      '2efcd6de19a22077ef28eb8100b81bcfe56c23783ee1c119412798ec05971f03',
    );
    expect(hashes('acc', [tx()])[0]).toBe(
      '245bff7068c4d19184b200ba76084b5384b01e5ccc8c2a17c85e53b15f08d156',
    );
  });
});

describe('computeImportHashes — fixtures end to end', () => {
  const fixtures = join(import.meta.dirname, '..', '..', '..', 'fixtures');

  const revolut: BankFormat = {
    encoding: 'utf-8',
    delimiter: ',',
    skipRows: 5,
    dateColumn: 'Date',
    dateFormat: 'MMM D, YYYY',
    descriptionColumns: ['Description'],
    amount: { mode: 'signed', column: 'Money in/out' },
    decimalSeparator: '.',
    thousandsSeparator: ',',
  };
  const trade: BankFormat = {
    encoding: 'utf-8',
    delimiter: ',',
    skipRows: 0,
    dateColumn: 'datetime',
    dateFormat: 'ISO_DATETIME_UTC',
    descriptionColumns: ['name', 'description'],
    descriptionMode: 'firstNonEmpty',
    amount: { mode: 'sum', columns: ['amount', 'fee', 'tax'] },
    decimalSeparator: '.',
    thousandsSeparator: '',
    externalIdColumn: 'transaction_id',
    kindColumn: 'type',
  };

  function load(file: string, format: BankFormat) {
    const parsed = parseBankCsv(readFileSync(join(fixtures, file), 'utf-8'), format);
    if (!parsed.ok) throw new Error(parsed.error);
    return normalizeTransactions(parsed.transactions);
  }

  it.each([
    ['Revolut (no bank id)', 'revolut-personal-eur-2025-01.csv', revolut],
    ['Trade Republic (bank id)', 'trade-republic-2026.csv', trade],
  ])('%s: re-import is identical and every movement is distinct', (_n, file, format) => {
    const txs = load(file, format);
    const first = hashes(A, txs);
    expect(first.length).toBeGreaterThan(0);
    expect(new Set(first).size).toBe(first.length);
    expect(hashes(A, load(file, format))).toEqual(first);
  });
});
