import { describe, expect, it } from 'vitest';
import { formatBookedOn, todayInRome } from './dates';

describe('todayInRome', () => {
  it('is already the next day in Rome just after 22:00 UTC in summer (UTC+2)', () => {
    expect(todayInRome(new Date('2026-07-16T22:30:00Z'))).toBe('2026-07-17');
  });
  it('uses UTC+1 in winter', () => {
    expect(todayInRome(new Date('2026-01-16T22:30:00Z'))).toBe('2026-01-16');
    expect(todayInRome(new Date('2026-01-16T23:30:00Z'))).toBe('2026-01-17');
  });
});

describe('formatBookedOn', () => {
  it('shows the date as written, whatever the server zone', () => {
    expect(formatBookedOn('2026-10-17')).toMatch(/^17 ott\.? 2026$/);
    expect(formatBookedOn('2026-01-01')).toMatch(/^1 gen\.? 2026$/);
  });
});
