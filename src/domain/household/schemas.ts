import { z } from 'zod';

// Same limits as create_household() in the database (ADR-022).
export const createHouseholdSchema = z.object({
  householdName: z
    .string()
    .trim()
    .min(1, { error: 'Dai un nome alla famiglia.' })
    .max(60, { error: 'Il nome della famiglia può avere al massimo 60 caratteri.' }),
  memberName: z
    .string()
    .trim()
    .min(1, { error: 'Scrivi il tuo nome.' })
    .max(40, { error: 'Il tuo nome può avere al massimo 40 caratteri.' }),
});

export type CreateHouseholdInput = z.infer<typeof createHouseholdSchema>;

// Same limits as accept_invite() in the database (task 0.7c).
export const acceptInviteSchema = z.object({
  memberName: z
    .string()
    .trim()
    .min(1, { error: 'Scrivi il tuo nome.' })
    .max(40, { error: 'Il tuo nome può avere al massimo 40 caratteri.' }),
});

export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;

// The role the invite grants once accepted (chosen by whoever creates it).
export const createInviteSchema = z.object({
  role: z.enum(['admin', 'member'], { error: 'Scegli un ruolo valido.' }),
});

export type CreateInviteInput = z.infer<typeof createInviteSchema>;
