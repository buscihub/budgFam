import { describe, expect, it } from 'vitest';
import { humanizeDescription } from './display';

describe('humanizeDescription', () => {
  it('capitalises each word of an uppercase description', () => {
    expect(humanizeDescription('CONAD PALERMO')).toBe('Conad Palermo');
  });
  it('is stable on text that is already readable', () => {
    expect(humanizeDescription('Caffè al bar')).toBe('Caffè Al Bar');
  });
  it('keeps spacing and handles empty text', () => {
    expect(humanizeDescription('A  B')).toBe('A  B');
    expect(humanizeDescription('')).toBe('');
  });
});
