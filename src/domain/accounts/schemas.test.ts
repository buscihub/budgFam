import { describe, expect, it } from 'vitest';
import { createAccountSchema, deleteAccountSchema, updateAccountSchema } from './schemas';

const valid = { name: 'Revolut', kind: 'bank', visibility: 'private', bankFormat: 'revolut' };

describe('createAccountSchema', () => {
  it('accepts a valid account and trims the name', () => {
    expect(createAccountSchema.parse({ ...valid, name: '  Revolut ' })).toEqual(valid);
  });

  it('treats an empty format as "not chosen yet"', () => {
    expect(createAccountSchema.parse({ ...valid, bankFormat: '' }).bankFormat).toBeNull();
  });

  it('rejects blank names and enforces the 60 characters limit', () => {
    expect(createAccountSchema.safeParse({ ...valid, name: '   ' }).success).toBe(false);
    expect(createAccountSchema.safeParse({ ...valid, name: 'x'.repeat(60) }).success).toBe(true);
    expect(createAccountSchema.safeParse({ ...valid, name: 'x'.repeat(61) }).success).toBe(false);
  });

  it('rejects unknown kinds, visibilities and formats', () => {
    expect(createAccountSchema.safeParse({ ...valid, kind: 'crypto' }).success).toBe(false);
    expect(createAccountSchema.safeParse({ ...valid, visibility: 'public' }).success).toBe(false);
    expect(createAccountSchema.safeParse({ ...valid, bankFormat: 'unicredit' }).success).toBe(
      false,
    );
  });

  it('cash accounts have no format', () => {
    expect(
      createAccountSchema.safeParse({ ...valid, kind: 'cash', bankFormat: 'revolut' }).success,
    ).toBe(false);
    expect(createAccountSchema.safeParse({ ...valid, kind: 'cash', bankFormat: '' }).success).toBe(
      true,
    );
  });

  it('bank and card accounts may have no format yet', () => {
    expect(createAccountSchema.safeParse({ ...valid, bankFormat: null }).success).toBe(true);
    expect(createAccountSchema.safeParse({ ...valid, kind: 'card', bankFormat: '' }).success).toBe(
      true,
    );
  });
});

describe('deleteAccountSchema', () => {
  it('requires a uuid', () => {
    expect(deleteAccountSchema.safeParse({ id: 'not-a-uuid' }).success).toBe(false);
    expect(
      deleteAccountSchema.safeParse({ id: '20000000-0000-4000-8000-000000000001' }).success,
    ).toBe(true);
  });
});

describe('updateAccountSchema (ADR-035)', () => {
  const id = '6f1c2d1e-0000-4000-8000-000000000001';

  it('accepts a new name and format, trimming the name', () => {
    expect(updateAccountSchema.parse({ id, name: ' Carta ', bankFormat: 'revolut' })).toEqual({
      id,
      name: 'Carta',
      bankFormat: 'revolut',
    });
  });

  it('treats an empty format as "choose at import"', () => {
    expect(updateAccountSchema.parse({ id, name: 'Carta', bankFormat: '' }).bankFormat).toBeNull();
  });

  it('rejects a blank name, an unknown format and a bad id', () => {
    expect(updateAccountSchema.safeParse({ id, name: '  ', bankFormat: '' }).success).toBe(false);
    expect(updateAccountSchema.safeParse({ id, name: 'x', bankFormat: 'intesa' }).success).toBe(
      false,
    );
    expect(updateAccountSchema.safeParse({ id: 'x', name: 'x', bankFormat: '' }).success).toBe(
      false,
    );
  });

  it('does not take the kind or the visibility: those do not change here', () => {
    const parsed = updateAccountSchema.parse({
      id,
      name: 'x',
      bankFormat: '',
      kind: 'cash',
      visibility: 'shared',
    });
    expect(parsed).not.toHaveProperty('kind');
    expect(parsed).not.toHaveProperty('visibility');
  });
});
