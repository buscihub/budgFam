import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { splitNewAndDuplicates } from './dedup';
import { prepareImport } from './prepare';
import { BANK_FORMAT_PRESETS } from './presets';

const fixture = (name: string) =>
  readFileSync(join(import.meta.dirname, '..', '..', '..', 'fixtures', name), 'utf-8');
const revolut = fixture('revolut-personal-eur-2025-01.csv');

describe('prepareImport', () => {
  it('turns a bank file into hashed, normalized rows', () => {
    const result = prepareImport(revolut, BANK_FORMAT_PRESETS.revolut, 'acc-1');
    if (!result.ok) throw new Error(result.error);
    expect(result.transactions).toHaveLength(21);
    expect(result.transactions.every((t) => t.importHash.length === 64)).toBe(true);
  });

  it('importing the same file twice: second time every row is a duplicate (rule 9)', () => {
    const first = prepareImport(revolut, BANK_FORMAT_PRESETS.revolut, 'acc-1');
    const second = prepareImport(revolut, BANK_FORMAT_PRESETS.revolut, 'acc-1');
    if (!first.ok || !second.ok) throw new Error('parse failed');
    const stored = new Set(first.transactions.map((t) => t.importHash));
    const { fresh, duplicates } = splitNewAndDuplicates(second.transactions, stored);
    expect(fresh).toHaveLength(0);
    expect(duplicates).toHaveLength(21);
  });

  it('the same file on another account is all new', () => {
    const a = prepareImport(revolut, BANK_FORMAT_PRESETS.revolut, 'acc-1');
    const b = prepareImport(revolut, BANK_FORMAT_PRESETS.revolut, 'acc-2');
    if (!a.ok || !b.ok) throw new Error('parse failed');
    const stored = new Set(a.transactions.map((t) => t.importHash));
    expect(splitNewAndDuplicates(b.transactions, stored).fresh).toHaveLength(21);
  });

  it('a file that is only preamble yields zero rows, not an error (the UI says so)', () => {
    const result = prepareImport('a,b\n1,2\n', BANK_FORMAT_PRESETS.revolut, 'acc-1');
    expect(result).toMatchObject({ ok: true, transactions: [] });
  });

  it('reports a file that does not match the format', () => {
    const wrong = 'x\n'.repeat(5) + 'foo,bar\n1,2\n3,4\n';
    expect(prepareImport(wrong, BANK_FORMAT_PRESETS.revolut, 'acc-1').ok).toBe(false);
  });
});
