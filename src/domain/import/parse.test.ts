import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { BankFormat } from './types';
import { parseBankCsv } from './parse';
import { BANK_FORMAT_PRESETS } from './presets';

const revolutFormat: BankFormat = BANK_FORMAT_PRESETS.revolut;

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

describe('parseBankCsv — Trade Republic fixture (ADR-024)', () => {
  const tradeFormat: BankFormat = BANK_FORMAT_PRESETS.trade_republic;
  const tradeFixture = readFileSync(
    join(import.meta.dirname, '..', '..', '..', 'fixtures', 'trade-republic-2026.csv'),
    'utf-8',
  );

  function parseOk() {
    const result = parseBankCsv(tradeFixture, tradeFormat);
    if (!result.ok) throw new Error(`expected ok, got: ${result.error}`);
    return result.transactions;
  }

  it('parses all 10 rows', () => {
    expect(parseOk()).toHaveLength(10);
  });

  it('nets fees and taxes into the amount', () => {
    const byId = Object.fromEntries(parseOk().map((t) => [t.externalId, t.amountCents]));
    expect(byId['id-0001']).toBe(60); // interest 0.81 - 0.21 tax
    expect(byId['id-0003']).toBe(-16); // amount 0, tax only
    expect(byId['id-0005']).toBe(-5000); // amount 0, card fee only
    expect(byId['id-0007']).toBe(10000); // top-up 101 - 1 fee
    expect(byId['id-0010']).toBe(1316); // sell 15.29 - 1.00 fee - 1.13 tax
    expect(byId['id-0002']).toBe(-3950); // plain card payment
  });

  it('books a movement at 23:06 UTC on the 16th on the 17th (Europe/Rome)', () => {
    const topUp = parseOk().find((t) => t.externalId === 'id-0007')!;
    expect(topUp.bookedOn).toBe('2026-02-17');
  });

  it('uses the merchant name for cards and the description for transfers', () => {
    const txs = parseOk();
    expect(txs.find((t) => t.externalId === 'id-0009')!.rawDescription).toBe('TABACCHERIA ESEMPIO');
    expect(txs.find((t) => t.externalId === 'id-0006')!.rawDescription).toMatch(
      /^Incoming transfer from/,
    );
  });

  it('carries the external id and the raw kind', () => {
    const buy = parseOk().find((t) => t.externalId === 'id-0004')!;
    expect(buy.kind).toBe('BUY');
  });

  it('fails the row when a summed cell is not an amount', () => {
    const bad = tradeFixture.replace('"-0.21"', '"abc"');
    const result = parseBankCsv(bad, tradeFormat);
    expect(result.ok).toBe(false);
  });
});
