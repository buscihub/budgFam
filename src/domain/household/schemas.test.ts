import { describe, expect, it } from 'vitest';
import { createHouseholdSchema } from './schemas';

const valid = { householdName: 'Famiglia Rossi', memberName: 'Federico' };

describe('createHouseholdSchema', () => {
  it('accepts valid names and trims them', () => {
    const parsed = createHouseholdSchema.parse({
      householdName: '  Famiglia Rossi ',
      memberName: ' Federico ',
    });
    expect(parsed).toEqual(valid);
  });

  it('rejects blank names', () => {
    expect(createHouseholdSchema.safeParse({ ...valid, householdName: '   ' }).success).toBe(false);
    expect(createHouseholdSchema.safeParse({ ...valid, memberName: '' }).success).toBe(false);
  });

  it('enforces the same maximum lengths as the database (60 and 40)', () => {
    expect(
      createHouseholdSchema.safeParse({ ...valid, householdName: 'x'.repeat(60) }).success,
    ).toBe(true);
    expect(
      createHouseholdSchema.safeParse({ ...valid, householdName: 'x'.repeat(61) }).success,
    ).toBe(false);
    expect(createHouseholdSchema.safeParse({ ...valid, memberName: 'x'.repeat(40) }).success).toBe(
      true,
    );
    expect(createHouseholdSchema.safeParse({ ...valid, memberName: 'x'.repeat(41) }).success).toBe(
      false,
    );
  });
});
