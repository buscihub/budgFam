import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BANK_FORMAT_IDS } from '../accounts/schemas';
import { getBankFormatPreset } from './presets';
import { parseBankCsv } from './parse';

const fixture = (name: string) =>
  readFileSync(join(import.meta.dirname, '..', '..', '..', 'fixtures', name), 'utf-8');

function parsePreset(id: string, file: string) {
  const preset = getBankFormatPreset(id);
  if (!preset) throw new Error(`no preset for ${id}`);
  const result = parseBankCsv(fixture(file), preset);
  if (!result.ok) throw new Error(`expected ok, got: ${result.error}`);
  return result.transactions;
}

describe('bank format presets (ADR-028)', () => {
  it('Revolut preset parses the Revolut fixture', () => {
    expect(parsePreset('revolut', 'revolut-personal-eur-2025-01.csv')).toHaveLength(21);
  });

  it('Trade Republic preset parses its fixture, with bank ids', () => {
    const txs = parsePreset('trade_republic', 'trade-republic-2026.csv');
    expect(txs).toHaveLength(10);
    expect(txs.every((t) => t.externalId !== undefined)).toBe(true);
  });

  it('every account format id except "auto" has a preset', () => {
    for (const id of BANK_FORMAT_IDS.filter((x) => x !== 'auto')) {
      expect(getBankFormatPreset(id), id).not.toBeNull();
    }
  });

  it('has no preset for "auto", null or unknown ids (including prototype keys)', () => {
    expect(getBankFormatPreset('auto')).toBeNull();
    expect(getBankFormatPreset(null)).toBeNull();
    expect(getBankFormatPreset('toString')).toBeNull();
  });
});
