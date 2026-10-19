import { describe, expect, it } from 'vitest';
import {
  normalizeDescription,
  normalizeTransactions,
  parseAmountToCents,
  toRomeDate,
} from './normalize';

const it_ = { decimalSeparator: ',', thousandsSeparator: '.' } as const;
const en = { decimalSeparator: '.', thousandsSeparator: ',' } as const;

describe('parseAmountToCents', () => {
  it('handles the Italian format (comma decimals, dot thousands)', () => {
    expect(parseAmountToCents('1.234,56', it_)).toBe(123456);
    expect(parseAmountToCents('-6,2', it_)).toBe(-620);
    expect(parseAmountToCents(',50', it_)).toBe(50);
    expect(parseAmountToCents('12', it_)).toBe(1200);
  });

  it('handles the English format and strips currency symbols', () => {
    expect(parseAmountToCents('-€6.20', en)).toBe(-620);
    expect(parseAmountToCents('€1,234.50', en)).toBe(123450);
    expect(parseAmountToCents('$ 0.05', en)).toBe(5);
  });

  it('handles an empty thousands separator', () => {
    expect(parseAmountToCents('1234,56', { decimalSeparator: ',', thousandsSeparator: '' })).toBe(
      123456,
    );
  });

  it('returns exact cents where float arithmetic would drift', () => {
    expect(
      parseAmountToCents('1.005', { decimalSeparator: '.', thousandsSeparator: '' }),
    ).toBeNull();
    expect(parseAmountToCents('0.29', en)).toBe(29); // 0.29 * 100 === 28.999999999999996
    expect(parseAmountToCents('1.15', en)).toBe(115);
  });

  it('accepts trailing zeros past the cents but not significant extra digits', () => {
    expect(parseAmountToCents('-39.500000', en)).toBe(-3950);
    expect(parseAmountToCents('0.810000', en)).toBe(81);
    expect(parseAmountToCents('0.005', en)).toBeNull();
    expect(parseAmountToCents('1.000001', en)).toBeNull();
  });

  it('never returns negative zero', () => {
    expect(Object.is(parseAmountToCents('-0,00', it_), 0)).toBe(true);
  });

  it('returns null for text that is not a plain amount', () => {
    expect(parseAmountToCents('', it_)).toBeNull();
    expect(parseAmountToCents('   ', it_)).toBeNull();
    expect(parseAmountToCents('abc', it_)).toBeNull();
    expect(parseAmountToCents('1,2,3', it_)).toBeNull();
    expect(parseAmountToCents('1,234', it_)).toBeNull(); // 3 decimals: refuse to round
    expect(parseAmountToCents('99999999999999999,00', it_)).toBeNull(); // beyond safe integer
  });
});

describe('normalizeDescription', () => {
  it('uppercases and collapses whitespace', () => {
    expect(normalizeDescription('  Tabacchi   Rotolo ')).toBe('TABACCHI ROTOLO');
  });

  it('removes standalone numeric tokens of 6+ digits', () => {
    expect(normalizeDescription('Pagamento POS 123456789 Esselunga')).toBe(
      'PAGAMENTO POS ESSELUNGA',
    );
    expect(normalizeDescription('Bonifico 000123 a Mario')).toBe('BONIFICO A MARIO');
  });

  it('keeps short numbers and digits attached to letters', () => {
    expect(normalizeDescription('Coop 123 Milano')).toBe('COOP 123 MILANO');
    expect(normalizeDescription('Ref12345678 shop 24h')).toBe('REF12345678 SHOP 24H');
    expect(normalizeDescription('Cassa 12345')).toBe('CASSA 12345'); // 5 digits stays
  });

  it('gives the same output for the same merchant with different operation codes', () => {
    expect(normalizeDescription('esselunga 998877')).toBe(
      normalizeDescription('ESSELUNGA  112233'),
    );
  });

  it('is idempotent', () => {
    const once = normalizeDescription('  Pagamento   pos 123456 coop 12 ');
    expect(normalizeDescription(once)).toBe(once);
  });

  it('returns an empty string when nothing is left', () => {
    expect(normalizeDescription(' 1234567 ')).toBe('');
  });
});

describe('normalizeDescription — IBAN', () => {
  it('removes IBANs, in any case and inside parentheses', () => {
    expect(normalizeDescription('Incoming transfer from Pagamenti (LU00000XX0XX000X0X00)')).toBe(
      'INCOMING TRANSFER FROM PAGAMENTI',
    );
    expect(normalizeDescription('bonifico it00x0000000000000000000000 affitto')).toBe(
      'BONIFICO AFFITTO',
    );
  });

  it('keeps ordinary codes that merely look like letters + digits', () => {
    expect(normalizeDescription('Spotify P40C3FD06C')).toBe('SPOTIFY P40C3FD06C');
  });
});

describe('toRomeDate', () => {
  it('converts a UTC instant to the Rome date, across midnight', () => {
    expect(toRomeDate('2026-02-16T23:06:14.607675Z')).toBe('2026-02-17'); // CET, UTC+1
    expect(toRomeDate('2026-02-16T12:00:00Z')).toBe('2026-02-16');
  });

  it('uses summer time (UTC+2) in July', () => {
    expect(toRomeDate('2026-07-16T22:30:00Z')).toBe('2026-07-17');
    expect(toRomeDate('2026-07-16T21:59:59Z')).toBe('2026-07-16');
  });

  it('rejects anything that is not a full UTC instant', () => {
    expect(toRomeDate('2026-02-16')).toBeNull();
    expect(toRomeDate('2026-02-16T10:00:00')).toBeNull();
    expect(toRomeDate('2026-13-45T10:00:00Z')).toBeNull();
    expect(toRomeDate('')).toBeNull();
  });
});

describe('normalizeTransactions', () => {
  it('normalizes descriptions and passes date and amount through', () => {
    expect(
      normalizeTransactions([
        { bookedOn: '2025-01-02', rawDescription: 'Tabacchi  Rotolo', amountCents: -620 },
      ]),
    ).toEqual([
      {
        bookedOn: '2025-01-02',
        description: 'TABACCHI ROTOLO',
        rawDescription: 'Tabacchi  Rotolo',
        amountCents: -620,
      },
    ]);
  });
});

describe('normalizeTransactions — optional fields', () => {
  it('carries externalId and kind only when present', () => {
    const [withIds, without] = normalizeTransactions([
      { bookedOn: '2026-01-01', rawDescription: 'x', amountCents: 1, externalId: 'a', kind: 'BUY' },
      { bookedOn: '2026-01-01', rawDescription: 'x', amountCents: 1 },
    ]);
    expect(withIds).toMatchObject({ externalId: 'a', kind: 'BUY' });
    expect(without).not.toHaveProperty('externalId');
    expect(without).not.toHaveProperty('kind');
  });
});
