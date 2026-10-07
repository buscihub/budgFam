import { describe, expect, it } from 'vitest';
import { loginSchema, signupSchema } from './schemas';

describe('signupSchema', () => {
  it('accepts a valid email and password', () => {
    const result = signupSchema.safeParse({ email: 'anna@example.com', password: 'correct horse' });
    expect(result.success).toBe(true);
  });

  it('trims and lowercases the email', () => {
    const result = signupSchema.parse({ email: '  Anna@Example.COM ', password: 'correct horse' });
    expect(result.email).toBe('anna@example.com');
  });

  it('rejects a malformed email', () => {
    const result = signupSchema.safeParse({ email: 'not-an-email', password: 'correct horse' });
    expect(result.success).toBe(false);
  });

  it('rejects a password shorter than 8 characters', () => {
    const result = signupSchema.safeParse({ email: 'anna@example.com', password: '1234567' });
    expect(result.success).toBe(false);
  });

  it('accepts a password of exactly 8 characters', () => {
    expect(
      signupSchema.safeParse({ email: 'anna@example.com', password: '12345678' }).success,
    ).toBe(true);
  });

  it('rejects a password longer than 72 characters (bcrypt would truncate it)', () => {
    const result = signupSchema.safeParse({ email: 'anna@example.com', password: 'a'.repeat(73) });
    expect(result.success).toBe(false);
  });

  it('reports Italian messages', () => {
    const result = signupSchema.safeParse({ email: 'x', password: 'short' });
    const messages = result.error?.issues.map((i) => i.message) ?? [];
    expect(messages).toContain('Inserisci un indirizzo email valido.');
    expect(messages).toContain('La password deve avere almeno 8 caratteri.');
  });
});

describe('loginSchema', () => {
  it('does not enforce the length rule, only that a password was typed', () => {
    expect(loginSchema.safeParse({ email: 'anna@example.com', password: 'abc' }).success).toBe(
      true,
    );
    expect(loginSchema.safeParse({ email: 'anna@example.com', password: '' }).success).toBe(false);
  });
});
