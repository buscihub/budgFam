import { describe, expect, it } from 'vitest';
import { formatMonthParam, monthLabel, monthRange, parseMonthParam, shiftMonth } from './months';

describe('parseMonthParam', () => {
  it('reads YYYY-MM', () => {
    expect(parseMonthParam('2026-09')).toEqual({ year: 2026, month: 9 });
  });
  it.each([
    undefined,
    '',
    '2026-9',
    '2026-13',
    '2026-00',
    '26-09',
    '2026-09-01',
    '1999-12',
    '2101-01',
  ])('returns null for %j', (raw) => {
    expect(parseMonthParam(raw)).toBeNull();
  });
  it('round-trips with formatMonthParam', () => {
    expect(formatMonthParam({ year: 2026, month: 3 })).toBe('2026-03');
  });
});

describe('shiftMonth', () => {
  it('moves across the year boundary in both directions', () => {
    expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
  });
  it('moves more than a year', () => {
    expect(shiftMonth({ year: 2026, month: 3 }, -15)).toEqual({ year: 2024, month: 12 });
    expect(shiftMonth({ year: 2026, month: 3 }, 0)).toEqual({ year: 2026, month: 3 });
  });
});

describe('monthLabel', () => {
  it('capitalises the Italian month name', () => {
    expect(monthLabel({ year: 2026, month: 9 })).toBe('Settembre 2026');
    expect(monthLabel({ year: 2027, month: 1 })).toBe('Gennaio 2027');
  });
});

describe('monthRange', () => {
  it('is half-open', () => {
    expect(monthRange({ year: 2026, month: 2 })).toEqual({ from: '2026-02-01', to: '2026-03-01' });
  });
  it('rolls December over to January', () => {
    expect(monthRange({ year: 2026, month: 12 })).toEqual({ from: '2026-12-01', to: '2027-01-01' });
  });
});
