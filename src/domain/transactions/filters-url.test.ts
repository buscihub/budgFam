import { describe, expect, it } from 'vitest';
import { countActiveFilters, transactionsHref } from './filters-url';

const base = { onlyToReview: false };

describe('transactionsHref', () => {
  it('is the bare path with no filters', () => {
    expect(transactionsHref(base)).toBe('/movimenti');
  });

  it('keeps every filter', () => {
    expect(
      transactionsHref({
        month: { year: 2026, month: 9 },
        accountId: 'a',
        categoryId: 'c',
        onlyToReview: true,
      }),
    ).toBe('/movimenti?mese=2026-09&conto=a&categoria=c&daRivedere=1');
  });

  it('applies a patch on top, e.g. the previous month', () => {
    expect(
      transactionsHref(
        { ...base, accountId: 'a', month: { year: 2026, month: 1 } },
        {
          month: { year: 2025, month: 12 },
        },
      ),
    ).toBe('/movimenti?mese=2025-12&conto=a');
  });

  it('drops a filter patched to undefined', () => {
    expect(transactionsHref({ ...base, accountId: 'a' }, { accountId: undefined })).toBe(
      '/movimenti',
    );
  });
});

describe('countActiveFilters', () => {
  it('does not count the month', () => {
    expect(countActiveFilters({ ...base, month: { year: 2026, month: 9 } })).toBe(0);
    expect(countActiveFilters({ accountId: 'a', onlyToReview: true })).toBe(2);
  });
});

describe('transactionsHref — on an account page', () => {
  const basePath = '/conti/abc';

  it('uses the account path and keeps month and other filters', () => {
    expect(
      transactionsHref(
        { month: { year: 2026, month: 9 }, categoryId: 'c', onlyToReview: true },
        { month: { year: 2026, month: 8 } },
        basePath,
      ),
    ).toBe('/conti/abc?mese=2026-08&categoria=c&daRivedere=1');
  });

  it('never puts the account in the query: the path already says which', () => {
    expect(transactionsHref({ ...base, accountId: 'a' }, {}, basePath)).toBe('/conti/abc');
  });
});
