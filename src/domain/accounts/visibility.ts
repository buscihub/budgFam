import { z } from 'zod';
import { isRealDate } from '../transactions/schemas';

// Changing who sees an account (ADR-015): an explicit action with a preview.
// What happens to the movements already there is a choice, never a surprise.
export const VISIBILITY_SCOPES = ['now', 'from_date', 'all'] as const;
export type VisibilityScope = (typeof VISIBILITY_SCOPES)[number];

export const VISIBILITY_SCOPE_LABELS: Record<VisibilityScope, string> = {
  now: 'Solo da ora',
  from_date: 'Da una data',
  all: 'Tutto lo storico',
};

const emptyToNull = (value: unknown) => (value === '' ? null : value);

export const changeVisibilitySchema = z
  .object({
    id: z.uuid({ error: 'Conto non valido.' }),
    visibility: z.enum(['private', 'shared'], { error: 'Scegli chi può vedere il conto.' }),
    scope: z.enum(VISIBILITY_SCOPES, { error: 'Scegli cosa fare dei movimenti già presenti.' }),
    fromDate: z.preprocess(emptyToNull, z.string().nullable()),
  })
  .superRefine((input, ctx) => {
    if (input.scope === 'from_date' && (!input.fromDate || !isRealDate(input.fromDate))) {
      ctx.addIssue({ code: 'custom', path: ['fromDate'], message: 'Scegli una data valida.' });
    }
  })
  // The date only means something for "from_date": drop it otherwise.
  .transform((input) => ({
    ...input,
    fromDate: input.scope === 'from_date' ? input.fromDate : null,
  }));

export type ChangeVisibilityInput = z.output<typeof changeVisibilitySchema>;

// The sentence under the choice: what will change, in the words of ADR-015.
// `others` = the other members of the family (who gain or lose the view).
export function visibilityImpactMessage(input: {
  to: 'private' | 'shared';
  scope: VisibilityScope;
  count: number;
  others: number;
}): string {
  const { to, scope, count, others } = input;
  const people =
    others === 0 ? 'agli altri familiari' : others === 1 ? 'a 1 persona' : `a ${others} persone`;
  const one = count === 1;
  const untouched = scope === 'now' || count === 0;

  if (to === 'shared') {
    if (untouched) {
      return 'I movimenti già presenti restano come sono. Quelli nuovi saranno visibili alla famiglia.';
    }
    return one
      ? `1 movimento diventerà visibile ${people}. Anche quelli nuovi.`
      : `${count} movimenti diventeranno visibili ${people}. Anche quelli nuovi.`;
  }
  const warning = 'Chi li ha già aperti ha potuto leggere i dati.';
  if (untouched) {
    return `I movimenti già presenti restano visibili alla famiglia. Quelli nuovi saranno solo tuoi. ${warning}`;
  }
  return one
    ? `1 movimento non sarà più visibile ${people}. Anche quelli nuovi. ${warning}`
    : `${count} movimenti non saranno più visibili ${people}. Anche quelli nuovi. ${warning}`;
}
