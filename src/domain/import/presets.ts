import type { BankFormat } from './types';

// One `BankFormat` per bank (§8.1, ADR-028). `accounts.bank_format` stores only
// the key; the mapping lives here, versioned and tested against the anonymized
// files in `fixtures/`. Adding a bank = a new entry + fixture + test, no
// migration. 'auto' is not here on purpose: it is a placeholder until format
// detection (task 2.3), so it has no preset to parse with.
export const BANK_FORMAT_PRESETS = {
  revolut: {
    encoding: 'utf-8',
    delimiter: ',',
    skipRows: 5,
    dateColumn: 'Date',
    dateFormat: 'MMM D, YYYY',
    descriptionColumns: ['Description'],
    amount: { mode: 'signed', column: 'Money in/out' },
    decimalSeparator: '.',
    thousandsSeparator: ',',
  },
  trade_republic: {
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
  },
} as const satisfies Record<string, BankFormat>;

export type PresetId = keyof typeof BANK_FORMAT_PRESETS;

// `accounts.bank_format` is a free string for the domain (null, 'auto', or a
// key): narrow it to a usable preset or say there is none.
export function getBankFormatPreset(id: string | null): BankFormat | null {
  if (id === null || !Object.hasOwn(BANK_FORMAT_PRESETS, id)) return null;
  return BANK_FORMAT_PRESETS[id as PresetId];
}
