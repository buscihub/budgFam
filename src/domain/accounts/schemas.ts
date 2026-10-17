import { z } from 'zod';

// Bank-format presets an account can use (ADR-028). The presets themselves are
// `BankFormat` objects in the code (§8.1); the database only stores the id, so
// adding a bank means a new entry here, not a migration. 'auto' is a
// placeholder until format detection (task 2.3).
export const BANK_FORMAT_IDS = ['revolut', 'trade_republic', 'auto'] as const;
export type BankFormatId = (typeof BANK_FORMAT_IDS)[number];

export const BANK_FORMAT_LABELS: Record<BankFormatId, string> = {
  revolut: 'Revolut',
  trade_republic: 'Trade Republic',
  auto: 'Riconosci dal file',
};

export const ACCOUNT_KINDS = ['bank', 'card', 'cash'] as const;
export type AccountKind = (typeof ACCOUNT_KINDS)[number];

export const ACCOUNT_KIND_LABELS: Record<AccountKind, string> = {
  bank: 'Conto corrente',
  card: 'Carta',
  cash: 'Contanti',
};

export const ACCOUNT_VISIBILITY_LABELS = {
  private: 'Privato',
  shared: 'Condiviso con la famiglia',
} as const;

// An HTML <select> sends '' for "no choice": that means "not chosen yet" (null).
const emptyToNull = (value: unknown) => (value === '' ? null : value);

export const createAccountSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, { error: 'Dai un nome al conto.' })
      .max(60, { error: 'Il nome può avere al massimo 60 caratteri.' }),
    kind: z.enum(ACCOUNT_KINDS, { error: 'Scegli il tipo di conto.' }),
    visibility: z.enum(['private', 'shared'], { error: 'Scegli chi può vedere il conto.' }),
    bankFormat: z.preprocess(
      emptyToNull,
      z.enum(BANK_FORMAT_IDS, { error: 'Formato non supportato.' }).nullable(),
    ),
  })
  // Same rule as the accounts_cash_has_no_format check in the database.
  .refine((account) => account.kind !== 'cash' || account.bankFormat === null, {
    path: ['bankFormat'],
    error: 'I contanti non hanno un file da importare.',
  });

export type CreateAccountInput = z.infer<typeof createAccountSchema>;

export const deleteAccountSchema = z.object({ id: z.uuid({ error: 'Conto non valido.' }) });
