import { describe, expect, it } from 'vitest';
import { safeNextPath } from './safe-next-path';

describe('safeNextPath', () => {
  it.each(['/', '/conti', '/movimenti?mese=2026-09&conto=a', '/conti/nuovo'])(
    'accepts the app path %s',
    (path) => {
      expect(safeNextPath(path)).toBe(path);
    },
  );

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
