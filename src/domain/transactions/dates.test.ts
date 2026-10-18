import { describe, expect, it } from 'vitest';
import { formatBookedOn, formatDayMonth, subtractDays, todayInRome } from './dates';

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

describe('subtractDays', () => {
  it('crosses month and year boundaries', () => {
    expect(subtractDays('2026-03-01', 1)).toBe('2026-02-28');
    expect(subtractDays('2026-01-05', 10)).toBe('2025-12-26');
  });
  it('subtracts 90 days', () => {
    expect(subtractDays('2026-10-18', 90)).toBe('2026-07-20');
  });
});

describe('formatDayMonth', () => {
  it('splits the date block of a row', () => {
    expect(formatDayMonth('2026-09-24')).toEqual({ day: '24', month: 'set' });
    expect(formatDayMonth('2026-01-05')).toEqual({ day: '5', month: 'gen' });
  });
});
