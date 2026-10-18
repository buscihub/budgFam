import { describe, expect, it } from 'vitest';
import { pickTopCategories, type PickableCategory } from './categories';

const cat = (id: string, kind: PickableCategory['kind'], isHidden = false): PickableCategory => ({
  id,
  name: id,
  kind,
  isHidden,
});

const categories = [
  cat('auto', 'expense'),
  cat('casa', 'expense'),
  cat('salute', 'expense'),
  cat('spesa', 'expense'),
  cat('svago', 'expense'),
  cat('stipendio', 'income'),
  cat('paghetta', 'transfer'),
  cat('bnb', 'excluded'),
  cat('vecchia', 'expense', true),
];
const ids = (list: PickableCategory[]) => list.map((c) => c.id);

describe('pickTopCategories', () => {
  it('puts the most used first', () => {
    expect(ids(pickTopCategories(categories, { svago: 9, spesa: 5, casa: 1 }, 'expense'))).toEqual([
      'svago',
      'spesa',
      'casa',
      'auto',
    ]);
  });

  it('keeps the given order for categories used the same number of times', () => {
    expect(ids(pickTopCategories(categories, {}, 'expense'))).toEqual([
      'auto',
      'casa',
      'salute',
      'spesa',
    ]);
  });

  it('offers only categories of the chosen direction', () => {
    expect(ids(pickTopCategories(categories, {}, 'income'))).toEqual(['stipendio']);
  });

  it('never suggests transfer, excluded or hidden categories', () => {
    const all = ids(
      pickTopCategories(categories, { paghetta: 99, bnb: 99, vecchia: 99 }, 'expense', 20),
    );
    expect(all).not.toContain('paghetta');
    expect(all).not.toContain('bnb');
    expect(all).not.toContain('vecchia');
  });

  it('respects the limit', () => {
    expect(pickTopCategories(categories, {}, 'expense', 2)).toHaveLength(2);
  });
});
