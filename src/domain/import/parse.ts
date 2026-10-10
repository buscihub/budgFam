import { parse as parseCsv } from 'csv-parse/sync';
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
    case 'MMM D, YYYY': {
      const m = /^([A-Za-z]{3}) (\d{1,2}), (\d{4})$/.exec(value);
      if (!m) return null;
      const month = MONTHS[m[1]!.toLowerCase()];
      return month ? `${m[3]}-${month}-${pad2(m[2]!)}` : null;
    }
  }
}

// Strips everything that isn't a digit, sign or decimal point (currency
// symbols, spaces, "€", "$"...) rather than adding a dedicated field to
// BankFormat: most bank exports embed a currency symbol in the amount
// column, and the set of possible symbols isn't worth modelling explicitly.
function parseAmountToCents(raw: string, format: BankFormat): number | null {
  const value = raw.trim();
  if (!value) return null;
  const isNegative = value.includes('-');
  let cleaned = value.replace(/-/g, '');
  if (format.thousandsSeparator) {
    cleaned = cleaned.split(format.thousandsSeparator).join('');
  }
  if (format.decimalSeparator !== '.') {
    cleaned = cleaned.replace(format.decimalSeparator, '.');
  }
  cleaned = cleaned.replace(/[^0-9.]/g, '');
  if (!cleaned) return null;
  const amount = Number(cleaned);
  if (!Number.isFinite(amount)) return null;
  const cents = Math.round(amount * 100);
  return isNegative ? -cents : cents;
}

type Row = Record<string, string>;

function readAmountCents(row: Row, format: BankFormat): number | null {
  if (format.amount.mode === 'signed') {
    const raw = row[format.amount.column];
    return raw === undefined ? null : parseAmountToCents(raw, format);
  }
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
    const rawDescription = format.descriptionColumns
      .map((col) => row[col] ?? '')
      .filter(Boolean)
      .join(' ')
      .trim();
    return { bookedOn, rawDescription, amountCents };
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
