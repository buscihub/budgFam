// Shared data shapes for the import pipeline (DESIGN_DOC §8): parsing (1.2),
// normalization (1.3) and deduplication (1.4) all pass the same transaction
// shape along the chain, so it lives here rather than inside any one step.

// The saved column mapping for one bank (§8.1). The first time a format is
// seen, the AI proposes this mapping once (task 2.3); from then on parsing
// is this deterministic code, no AI, no cost.
export type BankFormat = {
  encoding: 'utf-8' | 'latin1';
  delimiter: ';' | ',' | '\t';
  skipRows: number; // junk header lines before the row that has the column names
  dateColumn: string;
  dateFormat:
    'DD/MM/YYYY' | 'YYYY-MM-DD' | 'DD-MM-YYYY' | 'DD.MM.YYYY' | 'MMM D, YYYY' | 'ISO_DATETIME_UTC'; // a UTC instant; the booking date is the Europe/Rome one (ADR-024)
  descriptionColumns: string[]; // sometimes the description is split across columns
  descriptionMode?: 'join' | 'firstNonEmpty'; // default 'join'
  amount:
    | { mode: 'signed'; column: string }
    | { mode: 'split'; debitColumn: string; creditColumn: string }
    | { mode: 'sum'; columns: string[] }; // net amount = amount + fees + taxes; empty cell = 0
  decimalSeparator: ',' | '.';
  thousandsSeparator: '.' | ',' | '';
  externalIdColumn?: string; // bank-assigned unique id, when there is one (used by dedup, task 1.4)
  kindColumn?: string; // raw movement type (BUY, CARD_TRANSACTION...), carried to classification
};

// Output of parseBankCsv (1.2); input of the normalization step (1.3).
export type ParsedTransaction = {
  bookedOn: string; // ISO YYYY-MM-DD
  rawDescription: string;
  amountCents: number; // signed, integer cents (rule 1)
  externalId?: string; // present only when the format has externalIdColumn
  kind?: string; // present only when the format has kindColumn
};

export type ParseResult =
  | { ok: true; transactions: ParsedTransaction[]; skippedRows: number }
  | { ok: false; error: string; rowIndex: number };

// Output of normalizeTransactions (1.3); input of the dedup hash (1.4). The
// description is the normalized one: that is what rules and the hash see.
export type NormalizedTransaction = {
  bookedOn: string; // ISO YYYY-MM-DD (a `date`, no time of day: rule 11)
  description: string;
  amountCents: number; // signed, integer cents
  externalId?: string;
  kind?: string;
};
