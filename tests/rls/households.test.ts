import { describe, expect, it } from 'vitest';
import { affected, denied, ids } from './helpers';
import { H1, H2, USER } from './fixtures';

describe('households', () => {
  it('members see only their own household', async () => {
    expect(await ids(USER.member, 'households')).toEqual([H1]);
    expect(await ids(USER.owner2, 'households')).toEqual([H2]);
  });

  it('any admin can rename the household', async () => {
    expect(
      await affected(USER.admin2, `update households set name = 'x' where id = $1`, [H1]),
    ).toBe(1);
  });

  it('an ordinary member cannot rename it', async () => {
    expect(
      await affected(USER.member, `update households set name = 'x' where id = $1`, [H1]),
    ).toBe(0);
  });

  it('only the primary admin can delete the household (ADR-016)', async () => {
    expect(await affected(USER.admin2, 'delete from households where id = $1', [H1])).toBe(0);
    expect(await affected(USER.member, 'delete from households where id = $1', [H1])).toBe(0);
    expect(await affected(USER.owner, 'delete from households where id = $1', [H1])).toBe(1);
  });

  it('owner_id cannot be changed with a plain UPDATE, not even by the owner (ADR-019)', async () => {
    await denied(USER.owner, 'privilege', 'update households set owner_id = $2 where id = $1', [
      H1,
      USER.member,
    ]);
  });

  it('no end user can create a household (ADR-014: onboarding is a later task)', async () => {
    await denied(
      USER.outsider,
      'rls',
      `insert into households (name, owner_id) values ('new', $1)`,
      [USER.outsider],
    );
  });
});
