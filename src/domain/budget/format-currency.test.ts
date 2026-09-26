import { describe, expect, it } from 'vitest';
import { formatCents } from './format-currency';

// Intl.NumberFormat('it-IT') puts a non-breaking space (U+00A0) before "€",
// and groups thousands only from 5 digits up (CLDR "min2" rule for it-IT):
// 1234 stays "1234", 12345 becomes "12.345".
const NBSP = ' ';

describe('formatCents', () => {
  it('formats an amount with thousands separator (>= 10 000 units)', () => {
    expect(formatCents(12345678)).toBe(`123.456,78${NBSP}€`);
  });

  it('formats a small amount without a thousands separator', () => {
    expect(formatCents(123456)).toBe(`1234,56${NBSP}€`);
  });

  it('formats zero', () => {
    expect(formatCents(0)).toBe(`0,00${NBSP}€`);
  });

  it('formats a negative amount', () => {
    expect(formatCents(-500)).toBe(`-5,00${NBSP}€`);
  });

  it('formats an amount under one euro', () => {
    expect(formatCents(9)).toBe(`0,09${NBSP}€`);
  });

  it('throws on a non-integer input', () => {
    expect(() => formatCents(10.5)).toThrow(/integer/);
  });
});
