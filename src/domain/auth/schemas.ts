import { z } from 'zod';

// Matches the minimum in supabase/config.toml. 72 is bcrypt's limit: longer
// passwords would be silently truncated by the hashing step.
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 72;

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: 'Inserisci un indirizzo email valido.' }));

// Login only checks that something was typed: the length rule applies when a
// password is chosen, so an old, shorter password never locks someone out.
export const loginSchema = z.object({
  email,
  password: z.string().min(1, { error: 'Inserisci la password.' }),
});

export const signupSchema = z.object({
  email,
  password: z
    .string()
    .min(MIN_PASSWORD_LENGTH, {
      error: `La password deve avere almeno ${MIN_PASSWORD_LENGTH} caratteri.`,
    })
    .max(MAX_PASSWORD_LENGTH, {
      error: `La password può avere al massimo ${MAX_PASSWORD_LENGTH} caratteri.`,
    }),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
