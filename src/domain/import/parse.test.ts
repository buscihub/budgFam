import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { BankFormat } from './types';
import { parseBankCsv } from './parse';

const revolutFormat: BankFormat = {
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

const fixturePath = join(
  import.meta.dirname,
  '..',
  '..',
  '..',
  'fixtures',
  'revolut-personal-eur-2025-01.csv',
);
const revolutFixture = readFileSync(fixturePath, 'utf-8');

describe('parseBankCsv — Revolut fixture (task 1.1)', () => {
  it('parses all 21 transactions, skipping the preamble and the Total footer row', () => {
    const result = parseBankCsv(revolutFixture, revolutFormat);
    if (!result.ok) throw new Error(`expected ok, got: ${result.error}`);
    expect(result.transactions).toHaveLength(21);
    expect(result.skippedRows).toBe(1); // the "Total,,,..." row
  });

  it('parses the first row: negative amount, currency symbol stripped', () => {
    const result = parseBankCsv(revolutFixture, revolutFormat);
    if (!result.ok) throw new Error(`expected ok, got: ${result.error}`);
    expect(result.transactions[0]).toEqual({
      bookedOn: '2025-01-02',
      rawDescription: 'Tabacchi Rotolo',
      amountCents: -620,
    });
  });

  it('parses a positive (deposit) row', () => {
    const result = parseBankCsv(revolutFixture, revolutFormat);
    if (!result.ok) throw new Error(`expected ok, got: ${result.error}`);
    expect(result.transactions[3]).toEqual({
      bookedOn: '2025-01-05',
      rawDescription: 'Apple Pay deposit by *1234',
      amountCents: 3000,
    });
  });
});

describe('parseBankCsv — date formats', () => {
  it('parses "MMM D, YYYY" for both single- and double-digit days', () => {
    const csv = 'Date,Description,Money in/out\n"Jan 2, 2025",A,-€1.00\n"Jan 31, 2025",B,-€2.00\n';
    const result = parseBankCsv(csv, { ...revolutFormat, skipRows: 0 });
    if (!result.ok) throw new Error(`expected ok, got: ${result.error}`);
    expect(result.transactions.map((t) => t.bookedOn)).toEqual(['2025-01-02', '2025-01-31']);
  });

  it('parses "DD/MM/YYYY"', () => {
    const format: BankFormat = { ...revolutFormat, skipRows: 0, dateFormat: 'DD/MM/YYYY' };
    const csv = 'Date,Description,Money in/out\n05/03/2025,A,-€1.00\n';
    const result = parseBankCsv(csv, format);
    if (!result.ok) throw new Error(`expected ok, got: ${result.error}`);
    expect(result.transactions[0]!.bookedOn).toBe('2025-03-05');
  });
});

describe('parseBankCsv — amount formats', () => {
  it('handles a thousands separator', () => {
    const csv = 'Date,Description,Money in/out\n"Jan 1, 2025",Big refund,"€1,042.83"\n';
    const result = parseBankCsv(csv, { ...revolutFormat, skipRows: 0 });
    if (!result.ok) throw new Error(`expected ok, got: ${result.error}`);
    expect(result.transactions[0]!.amountCents).toBe(104283);
  });

  it('supports split debit/credit columns', () => {
    const format: BankFormat = {
      ...revolutFormat,
      skipRows: 0,
      amount: { mode: 'split', debitColumn: 'Dare', creditColumn: 'Avere' },
    };
    const csv =
      'Date,Description,Dare,Avere\n"Jan 1, 2025",Spesa,12.50,\n"Jan 2, 2025",Stipendio,,1500.00\n';
    const result = parseBankCsv(csv, format);
    if (!result.ok) throw new Error(`expected ok, got: ${result.error}`);
    expect(result.transactions.map((t) => t.amountCents)).toEqual([-1250, 150000]);
  });
});

describe('parseBankCsv — CSV quoting and malformed rows', () => {
  it('keeps a comma inside a quoted description intact', () => {
    const csv = 'Date,Description,Money in/out\n"Jan 1, 2025","Transfer, urgent",-€5.00\n';
    const result = parseBankCsv(csv, { ...revolutFormat, skipRows: 0 });
    if (!result.ok) throw new Error(`expected ok, got: ${result.error}`);
    expect(result.transactions[0]!.rawDescription).toBe('Transfer, urgent');
  });

  it('fails with the offending row index when a data row has an invalid date in the middle', () => {
    const csv = [
      'Date,Description,Money in/out',
      '"Jan 1, 2025",Good row 1,-€1.00',
      '"Jan 2, 2025",Good row 2,-€2.00',
      'NOT A DATE,Bad row,-€3.00',
      '"Jan 4, 2025",Good row 4,-€4.00',
    ].join('\n');
    const result = parseBankCsv(csv, { ...revolutFormat, skipRows: 0 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.rowIndex).toBe(2);
  });

  it('treats trailing rows after the last good one as a footer, not an error', () => {
    const csv = [
      'Date,Description,Money in/out',
      '"Jan 1, 2025",Good row,-€1.00',
      'Total,,-€1.00',
    ].join('\n');
    const result = parseBankCsv(csv, { ...revolutFormat, skipRows: 0 });
    if (!result.ok) throw new Error(`expected ok, got: ${result.error}`);
    expect(result.transactions).toHaveLength(1);
    expect(result.skippedRows).toBe(1);
  });
});
