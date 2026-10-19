import { z } from 'zod';
import { normalizeDescription, parseAmountToCents } from '../import/normalize';
import { parseMonthParam, type MonthKey } from './months';

export const NOTE_MAX_LENGTH = 500; // same limit as the transactions_note_length check

export const VISIBILITY_LABELS = {
  private: 'Privato',
  shared: 'Condiviso con la famiglia',
} as const;

// An HTML <select>/<input> sends '' for "nothing chosen": that means null.
const emptyToNull = (value: unknown) => (value === '' ? null : value);

// Amount typed by a person in a form, always positive: whether it is money in
// or out is a separate choice. Returns integer cents, or null if it isn't a
// plain amount. Italian people type "12,50", but a phone keyboard or a
// copy-paste can give "12.50"; both mean twelve euros and fifty. The bank
// parser's "." = thousands separator reading would turn "12.50" into 1250 euro
// (rule 1: a silent x100 is the worst failure here), so the decimal mark is
// chosen by what was typed: a comma wins; otherwise a dot is a decimal point.
// "1.234" (ambiguous) is refused rather than guessed: parseAmountToCents
// rejects a non-zero digit beyond the cents.
export function parseTypedAmount(raw: string): number | null {
  const value = raw.trim().replace(/\s/g, '');
  if (!/^\d*[.,]?\d*$/.test(value) || !/\d/.test(value)) return null;
  const cents = parseAmountToCents(value, {
    decimalSeparator: value.includes(',') ? ',' : '.',
    thousandsSeparator: '',
  });
  return cents !== null && cents > 0 ? cents : null;
}

export function isRealDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}

export const createManualTransactionSchema = z
  .object({
    accountId: z.uuid({ error: 'Scegli il conto.' }),
    direction: z.enum(['expense', 'income'], { error: 'Scegli se è un’entrata o un’uscita.' }),
    amount: z.string().transform((raw, ctx) => {
      const cents = parseTypedAmount(raw);
      if (cents === null) {
        ctx.addIssue({ code: 'custom', message: 'Scrivi un importo valido, per esempio 12,50.' });
        return z.NEVER;
      }
      return cents;
    }),
    categoryId: z.preprocess(emptyToNull, z.uuid({ error: 'Categoria non valida.' }).nullable()),
    description: z
      .string()
      .trim()
      .min(1, { error: 'Scrivi una descrizione.' })
      .max(120, { error: 'La descrizione può avere al massimo 120 caratteri.' }),
    bookedOn: z.string().refine(isRealDate, { error: 'Scegli una data valida.' }),
    // Absent = follow the account (the default, ADR-015); present = the person chose.
    visibility: z.preprocess(emptyToNull, z.enum(['private', 'shared']).nullable()),
  })
  .transform((input) => ({
    accountId: input.accountId,
    amountCents: input.direction === 'expense' ? -input.amount : input.amount,
    categoryId: input.categoryId,
    rawDescription: input.description,
    description: normalizeDescription(input.description),
    bookedOn: input.bookedOn,
    visibility: input.visibility,
  }));

export type CreateManualTransactionInput = z.output<typeof createManualTransactionSchema>;

export const updateTransactionSchema = z.object({
  id: z.uuid({ error: 'Movimento non valido.' }),
  categoryId: z.preprocess(emptyToNull, z.uuid({ error: 'Categoria non valida.' }).nullable()),
  note: z.preprocess(
    (value) => (typeof value === 'string' ? value.trim() || null : value),
    z
      .string()
      .max(NOTE_MAX_LENGTH, { error: `La nota può avere al massimo ${NOTE_MAX_LENGTH} caratteri.` })
      .nullable(),
  ),
  // Absent = leave it alone: only the owner decides who sees a movement (ADR-015),
  // so the form of anyone else does not send it.
  visibility: z
    .enum(['private', 'shared'], { error: 'Scegli chi può vedere il movimento.' })
    .optional(),
  // "Torna a seguire il conto": the visibility goes back to the account's and
  // the manual override is cleared (ADR-015). It wins over `visibility`.
  followAccount: z.preprocess((value) => value === '1', z.boolean()),
});

export type UpdateTransactionInput = z.output<typeof updateTransactionSchema>;

export const deleteTransactionSchema = z.object({ id: z.uuid({ error: 'Movimento non valido.' }) });

// List filters, read from the URL. Anything malformed is dropped, not an
// error: a hand-edited link should show the unfiltered list, not a crash.
export type TransactionFilters = {
  // Undefined = the current month in Europe/Rome, decided where the clock is
  // read (src/data), not here.
  month?: MonthKey;
  accountId?: string;
  categoryId?: string;
  onlyToReview: boolean;
};

export function parseTransactionFilters(
  params: Record<string, string | string[] | undefined>,
): TransactionFilters {
  const first = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const uuid = (key: string) => {
    const parsed = z.uuid().safeParse(first(key));
    return parsed.success ? parsed.data : undefined;
  };
  return {
    month: parseMonthParam(first('mese')) ?? undefined,
    accountId: uuid('conto'),
    categoryId: uuid('categoria'),
    onlyToReview: first('daRivedere') === '1',
  };
}
