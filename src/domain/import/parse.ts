import { parse as parseCsv } from 'csv-parse/sync';
import { parseAmountToCents, toRomeDate } from './normalize';
import type { BankFormat, ParsedTransaction, ParseResult } from './types';

const MONTHS: Record<string, string> = {
  jan: '01',
  feb: '02',
  mar: '03',
  apr: '04',
  may: '05',
  jun: '06',
  jul: '07',
  aug: '08',
  sep: '09',
  oct: '10',
  nov: '11',
  dec: '12',
};

function pad2(digits: string): string {
  return digits.length === 1 ? `0${digits}` : digits;
}

// Returns an ISO date, or null if `raw` doesn't match `format` at all. The
// caller relies on null to tell "this isn't a data row" (e.g. a footer line
// like "Total,,,...") apart from a row that merely failed to parse.
function parseDate(raw: string, format: BankFormat['dateFormat']): string | null {
  const value = raw.trim();
  switch (format) {
    case 'YYYY-MM-DD': {
      const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value);
      return m ? `${m[1]}-${pad2(m[2]!)}-${pad2(m[3]!)}` : null;
    }
    case 'DD/MM/YYYY': {
      const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
      return m ? `${m[3]}-${pad2(m[2]!)}-${pad2(m[1]!)}` : null;
    }
    case 'DD-MM-YYYY': {
      const m = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(value);
      return m ? `${m[3]}-${pad2(m[2]!)}-${pad2(m[1]!)}` : null;
    }
    case 'DD.MM.YYYY': {
      const m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(value);
      return m ? `${m[3]}-${pad2(m[2]!)}-${pad2(m[1]!)}` : null;
    }
    case 'ISO_DATETIME_UTC':
      return toRomeDate(value);
    case 'MMM D, YYYY': {
      const m = /^([A-Za-z]{3}) (\d{1,2}), (\d{4})$/.exec(value);
      if (!m) return null;
      const month = MONTHS[m[1]!.toLowerCase()];
      return month ? `${m[3]}-${month}-${pad2(m[2]!)}` : null;
    }
  }
}

type Row = Record<string, string>;

// Net amount over several columns. An empty cell counts as 0, but a
// non-empty cell that isn't an amount fails the row, and so does a row where
// every cell is empty (that's not a movement, e.g. a footer).
function sumCells(row: Row, columns: string[], format: BankFormat): number | null {
  let total = 0;
  let anyValue = false;
  for (const column of columns) {
    const cell = (row[column] ?? '').trim();
    if (!cell) continue;
    const cents = parseAmountToCents(cell, format);
    if (cents === null) return null;
    total += cents;
    anyValue = true;
  }
  return anyValue ? total : null;
}

function readAmountCents(row: Row, format: BankFormat): number | null {
  if (format.amount.mode === 'signed') {
    const raw = row[format.amount.column];
    return raw === undefined ? null : parseAmountToCents(raw, format);
  }
  if (format.amount.mode === 'sum') return sumCells(row, format.amount.columns, format);
  const debit = parseAmountToCents(row[format.amount.debitColumn] ?? '', format);
  const credit = parseAmountToCents(row[format.amount.creditColumn] ?? '', format);
  if (!debit && !credit) return null;
  // Split formats put an unsigned magnitude in exactly one of the two
  // columns per row; a populated debit column means money left the account.
  return credit ? Math.abs(credit) : -Math.abs(debit ?? 0);
}

export function parseBankCsv(csvText: string, format: BankFormat): ParseResult {
  const lines = csvText.split(/\r?\n/);
  const afterSkip = lines.slice(format.skipRows).join('\n');

  const records = parseCsv(afterSkip, {
    delimiter: format.delimiter,
    relax_column_count: true,
    skip_empty_lines: true,
  }) as string[][];

  if (records.length === 0) {
    return { ok: true, transactions: [], skippedRows: 0 };
  }

  const header = records[0]!.map((cell) => cell.trim());
  const dataRows = records.slice(1);

  function toRowObject(cells: string[]): Row {
    const row: Row = {};
    header.forEach((name, i) => {
      row[name] = cells[i] ?? '';
    });
    return row;
  }

  const parsedByIndex: (ParsedTransaction | null)[] = dataRows.map((cells) => {
    const row = toRowObject(cells);
    const bookedOn = parseDate(row[format.dateColumn] ?? '', format.dateFormat);
    if (bookedOn === null) return null;
    const amountCents = readAmountCents(row, format);
    if (amountCents === null) return null;
    const descriptionCells = format.descriptionColumns.map((col) => (row[col] ?? '').trim());
    const rawDescription =
      format.descriptionMode === 'firstNonEmpty'
        ? (descriptionCells.find(Boolean) ?? '')
        : descriptionCells.filter(Boolean).join(' ');
    const externalId = format.externalIdColumn ? row[format.externalIdColumn]?.trim() : undefined;
    const kind = format.kindColumn ? row[format.kindColumn]?.trim() : undefined;
    return {
      bookedOn,
      rawDescription,
      amountCents,
      ...(externalId && { externalId }),
      ...(kind && { kind }),
    };
  });

  // The last successfully-parsed row is the end of real data; everything
  // after it (e.g. a "Total,,,..." footer line) is trailing noise, not an
  // error. See the rowIndex loop below for the opposite case: a row that
  // fails to parse *before* that point is a real problem, not a footer.
  let lastGoodIndex = -1;
  for (let i = parsedByIndex.length - 1; i >= 0; i--) {
    if (parsedByIndex[i] !== null) {
      lastGoodIndex = i;
      break;
    }
  }

  if (lastGoodIndex === -1) {
    return dataRows.length === 0
      ? { ok: true, transactions: [], skippedRows: 0 }
      : { ok: false, error: 'no row matches the configured BankFormat', rowIndex: 0 };
  }

  for (let i = 0; i <= lastGoodIndex; i++) {
    if (parsedByIndex[i] === null) {
      return { ok: false, error: `row ${i} does not match the configured BankFormat`, rowIndex: i };
    }
  }

  return {
    ok: true,
    transactions: parsedByIndex.slice(0, lastGoodIndex + 1) as ParsedTransaction[],
    skippedRows: dataRows.length - 1 - lastGoodIndex,
  };
}
