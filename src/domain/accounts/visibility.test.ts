import { describe, expect, it } from 'vitest';
import { changeVisibilitySchema, visibilityImpactMessage } from './visibility';

const id = '6f1c2d1e-0000-4000-8000-000000000001';

describe('changeVisibilitySchema (ADR-015)', () => {
  it('accepts "from now" with no date', () => {
    expect(
      changeVisibilitySchema.parse({ id, visibility: 'shared', scope: 'now', fromDate: '' }),
    ).toEqual({ id, visibility: 'shared', scope: 'now', fromDate: null });
  });

  it('requires a real date for "from a date"', () => {
    const base = { id, visibility: 'shared', scope: 'from_date' };
    expect(changeVisibilitySchema.safeParse({ ...base, fromDate: '' }).success).toBe(false);
    expect(changeVisibilitySchema.safeParse({ ...base, fromDate: '2026-02-30' }).success).toBe(
      false,
    );
    expect(changeVisibilitySchema.parse({ ...base, fromDate: '2026-03-01' }).fromDate).toBe(
      '2026-03-01',
    );
  });

  it('ignores a date sent with "all" or "now"', () => {
    expect(
      changeVisibilitySchema.parse({
        id,
        visibility: 'private',
        scope: 'all',
        fromDate: '2026-03-01',
      }).fromDate,
    ).toBeNull();
  });

  it('rejects unknown visibility, unknown scope and a bad id', () => {
    expect(
      changeVisibilitySchema.safeParse({ id, visibility: 'public', scope: 'now', fromDate: '' })
        .success,
    ).toBe(false);
    expect(
      changeVisibilitySchema.safeParse({ id, visibility: 'shared', scope: 'later', fromDate: '' })
        .success,
    ).toBe(false);
    expect(
      changeVisibilitySchema.safeParse({
        id: 'x',
        visibility: 'shared',
        scope: 'now',
        fromDate: '',
      }).success,
    ).toBe(false);
  });
});

describe('visibilityImpactMessage', () => {
  it('with nobody else in the family yet, speaks of the other members in general', () => {
    expect(visibilityImpactMessage({ to: 'shared', scope: 'all', count: 2, others: 0 })).toMatch(
      /visibili agli altri familiari/,
    );
  });

  it('says how many movements become visible, and to whom', () => {
    expect(visibilityImpactMessage({ to: 'shared', scope: 'all', count: 34, others: 3 })).toMatch(
      /^34 movimenti diventeranno visibili a 3 persone/,
    );
  });

  it('uses the singular', () => {
    expect(visibilityImpactMessage({ to: 'shared', scope: 'all', count: 1, others: 1 })).toMatch(
      /^1 movimento diventerà visibile a 1 persona\./,
    );
  });

  it('from now changes no existing movement', () => {
    expect(visibilityImpactMessage({ to: 'shared', scope: 'now', count: 34, others: 3 })).toMatch(
      /già presenti restano come sono/,
    );
  });

  it('going private warns that others may already have read the data', () => {
    expect(visibilityImpactMessage({ to: 'private', scope: 'all', count: 5, others: 3 })).toMatch(
      /già aperti ha potuto leggere/,
    );
    expect(visibilityImpactMessage({ to: 'private', scope: 'now', count: 5, others: 3 })).toMatch(
      /già aperti ha potuto leggere/,
    );
  });
});
