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
  dateFormat: 'DD/MM/YYYY' | 'YYYY-MM-DD' | 'DD-MM-YYYY' | 'DD.MM.YYYY' | 'MMM D, YYYY';
  descriptionColumns: string[]; // sometimes the description is split across columns
  amount:
    | { mode: 'signed'; column: string }
    | { mode: 'split'; debitColumn: string; creditColumn: string };
  decimalSeparator: ',' | '.';
  thousandsSeparator: '.' | ',' | '';
};

// Output of parseBankCsv (1.2); input of the normalization step (1.3).
export type ParsedTransaction = {
  bookedOn: string; // ISO YYYY-MM-DD; timezone normalization is task 1.3
  rawDescription: string;
  amountCents: number; // signed, integer cents (rule 1)
};

export type ParseResult =
  | { ok: true; transactions: ParsedTransaction[]; skippedRows: number }
  | { ok: false; error: string; rowIndex: number };
