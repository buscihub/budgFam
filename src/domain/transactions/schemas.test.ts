import { describe, expect, it } from 'vitest';
import {
  createManualTransactionSchema,
  parseTransactionFilters,
  parseTypedAmount,
  updateTransactionSchema,
} from './schemas';

const ID = '7d444840-9dc0-41d8-8e7f-d0e2b8f1a001';
const OTHER_ID = '7d444840-9dc0-41d8-8e7f-d0e2b8f1a002';

describe('parseTypedAmount', () => {
  it.each([
    ['12,50', 1250],
    ['12.50', 1250],
    ['12', 1200],
    ['0,05', 5],
    [',50', 50],
    ['1234,5', 123450],
    [' 7 ', 700],
  ])('reads %s as %i cents', (raw, cents) => {
    expect(parseTypedAmount(raw)).toBe(cents);
  });

  it.each(['', 'abc', '0', '0,00', '-5', '1,2,3', '1.234', '12,505', '12€', '1 000,5x'])(
    'refuses %j',
    (raw) => {
      expect(parseTypedAmount(raw)).toBeNull();
    },
  );
});

describe('createManualTransactionSchema', () => {
  const valid = {
    accountId: ID,
    direction: 'expense',
    amount: '12,50',
    categoryId: '',
    description: '  caffè  bar ',
    bookedOn: '2026-10-17',
    visibility: '',
  };

  it('turns an expense into negative cents and normalizes the description', () => {
    expect(createManualTransactionSchema.parse(valid)).toEqual({
      accountId: ID,
      amountCents: -1250,
      categoryId: null,
      rawDescription: 'caffè  bar',
      description: 'CAFFÈ BAR',
      bookedOn: '2026-10-17',
      visibility: null,
    });
  });

  it('keeps income positive', () => {
    expect(createManualTransactionSchema.parse({ ...valid, direction: 'income' }).amountCents).toBe(
      1250,
    );
  });

  it('passes an explicit visibility and category through', () => {
    const parsed = createManualTransactionSchema.parse({
      ...valid,
      visibility: 'shared',
      categoryId: OTHER_ID,
    });
    expect(parsed.visibility).toBe('shared');
    expect(parsed.categoryId).toBe(OTHER_ID);
  });

  it.each([
    ['amount', '0'],
    ['amount', 'dieci'],
    ['description', '   '],
    ['description', 'x'.repeat(121)],
    ['bookedOn', '2026-02-30'],
    ['bookedOn', '17/10/2026'],
    ['direction', 'transfer'],
    ['accountId', 'not-a-uuid'],
    ['visibility', 'public'],
  ])('rejects %s = %j', (field, value) => {
    expect(createManualTransactionSchema.safeParse({ ...valid, [field]: value }).success).toBe(
      false,
    );
  });
});

describe('updateTransactionSchema', () => {
  const valid = {
    id: ID,
    categoryId: OTHER_ID,
    note: ' pagato in contanti ',
    visibility: 'shared',
  };

  it('trims the note and treats a blank one as none', () => {
    expect(updateTransactionSchema.parse(valid).note).toBe('pagato in contanti');
    expect(updateTransactionSchema.parse({ ...valid, note: '   ' }).note).toBeNull();
  });

  it('treats an empty category as "no category"', () => {
    expect(updateTransactionSchema.parse({ ...valid, categoryId: '' }).categoryId).toBeNull();
  });

  it('enforces the 500 characters limit on the note', () => {
    expect(updateTransactionSchema.safeParse({ ...valid, note: 'x'.repeat(500) }).success).toBe(
      true,
    );
    expect(updateTransactionSchema.safeParse({ ...valid, note: 'x'.repeat(501) }).success).toBe(
      false,
    );
  });

  it('rejects an unknown visibility', () => {
    expect(updateTransactionSchema.safeParse({ ...valid, visibility: 'x' }).success).toBe(false);
  });
});

describe('parseTransactionFilters', () => {
  it('reads valid filters', () => {
    expect(parseTransactionFilters({ conto: ID, categoria: OTHER_ID, daRivedere: '1' })).toEqual({
      accountId: ID,
      categoryId: OTHER_ID,
      onlyToReview: true,
    });
  });

  it('drops malformed values instead of failing', () => {
    expect(parseTransactionFilters({ conto: 'x', categoria: ['y'], daRivedere: 'yes' })).toEqual({
      accountId: undefined,
      categoryId: undefined,
      onlyToReview: false,
    });
  });

  it('uses the first value when a key is repeated', () => {
    expect(parseTransactionFilters({ conto: [ID, OTHER_ID] }).accountId).toBe(ID);
  });
});
