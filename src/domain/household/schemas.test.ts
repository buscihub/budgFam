import { describe, expect, it } from 'vitest';
import { acceptInviteSchema, createHouseholdSchema, createInviteSchema } from './schemas';

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

describe('acceptInviteSchema', () => {
  it('accepts a valid name and trims it', () => {
    expect(acceptInviteSchema.parse({ memberName: ' Zia Anna ' })).toEqual({
      memberName: 'Zia Anna',
    });
  });

  it('rejects a blank name', () => {
    expect(acceptInviteSchema.safeParse({ memberName: '   ' }).success).toBe(false);
  });

  it('enforces the same maximum length as the database (40)', () => {
    expect(acceptInviteSchema.safeParse({ memberName: 'x'.repeat(40) }).success).toBe(true);
    expect(acceptInviteSchema.safeParse({ memberName: 'x'.repeat(41) }).success).toBe(false);
  });
});

describe('createInviteSchema', () => {
  it('accepts admin or member', () => {
    expect(createInviteSchema.safeParse({ role: 'admin' }).success).toBe(true);
    expect(createInviteSchema.safeParse({ role: 'member' }).success).toBe(true);
  });

  it('rejects anything else', () => {
    expect(createInviteSchema.safeParse({ role: 'owner' }).success).toBe(false);
  });
});
