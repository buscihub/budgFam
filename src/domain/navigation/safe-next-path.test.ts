import { describe, expect, it } from 'vitest';
import { returnPath, safeNextPath, withMonthParam } from './safe-next-path';

describe('safeNextPath', () => {
  it.each([
    '/',
    '/conti',
    '/movimenti?mese=2026-09&conto=a',
    '/conti/nuovo',
    '/conti/6f1c2d1e-0000-4000-8000-000000000001?mese=2026-09',
  ])('accepts the app path %s', (path) => {
    expect(safeNextPath(path)).toBe(path);
  });

  it.each([
    '//evil.com',
    '/\\evil.com',
    '/\t/evil.com',
    '/\n/evil.com',
    '/%2F/evil.com',
    'https://evil.com',
    'javascript:alert(1)',
    'conti',
    '',
    '/../etc',
    '/a b',
  ])('refuses %j', (value) => {
    expect(safeNextPath(value)).toBeNull();
  });

  it('refuses what is not a string', () => {
    expect(safeNextPath(null)).toBeNull();
    expect(safeNextPath(undefined)).toBeNull();
    expect(safeNextPath(['/conti'])).toBeNull();
  });
});

describe('returnPath', () => {
  it('returns a safe path as it is', () => {
    expect(returnPath('/conti/abc?mese=2026-09')).toBe('/conti/abc?mese=2026-09');
  });

  it('falls back to Tutti i movimenti for anything unsafe or missing', () => {
    expect(returnPath('//evil.com')).toBe('/movimenti');
    expect(returnPath(undefined)).toBe('/movimenti');
    expect(returnPath(null, '/conti')).toBe('/conti');
  });
});

describe('withMonthParam', () => {
  it('adds the month to a path without a query', () => {
    expect(withMonthParam('/movimenti', '2025-01')).toBe('/movimenti?mese=2025-01');
  });

  it('replaces the month and keeps the other filters', () => {
    expect(withMonthParam('/conti/abc?mese=2026-10&categoria=c', '2025-01')).toBe(
      '/conti/abc?mese=2025-01&categoria=c',
    );
  });

  it('keeps a result that safeNextPath still accepts', () => {
    expect(safeNextPath(withMonthParam('/conti/abc?daRivedere=1', '2025-01'))).not.toBeNull();
  });
});
