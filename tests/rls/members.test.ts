import { describe, expect, it } from 'vitest';
import { affected, denied, ids } from './helpers';
import { H1, USER } from './fixtures';

const addMember = (role: string) =>
  `insert into members (household_id, user_id, display_name, role) values ('${H1}', '${USER.outsider}', 'new', '${role}')`;
const setRole = (role: string, user: string) =>
  `update members set role = '${role}' where household_id = '${H1}' and user_id = '${user}'`;
const remove = (user: string) =>
  `delete from members where household_id = '${H1}' and user_id = '${user}'`;

describe('members: reading', () => {
  it('members see everyone in their household and nobody else', async () => {
    expect(await ids(USER.member, 'members', 'user_id')).toEqual(
      [USER.owner, USER.admin2, USER.member].sort(),
    );
  });
});

describe('members: adding (ADR-016)', () => {
  it('a secondary admin can add an ordinary member', async () => {
    expect(await affected(USER.admin2, addMember('member'))).toBe(1);
  });
  it('a secondary admin cannot add an admin', async () => {
    await denied(USER.admin2, 'rls', addMember('admin'));
  });
  it('the primary admin can add an admin', async () => {
    expect(await affected(USER.owner, addMember('admin'))).toBe(1);
  });
  it('an ordinary member cannot add anybody', async () => {
    await denied(USER.member, 'rls', addMember('member'));
  });
});

describe('members: changing roles (ADR-016)', () => {
  it('a secondary admin cannot promote a member to admin', async () => {
    await denied(USER.admin2, 'rls', setRole('admin', USER.member));
  });
  it('the primary admin can promote and demote', async () => {
    expect(await affected(USER.owner, setRole('admin', USER.member))).toBe(1);
    expect(await affected(USER.owner, setRole('member', USER.admin2))).toBe(1);
  });
  it('a secondary admin cannot touch the primary admin', async () => {
    expect(await affected(USER.admin2, setRole('member', USER.owner))).toBe(0);
  });
  it('the primary admin cannot demote themselves', async () => {
    await denied(USER.owner, 'rls', setRole('member', USER.owner));
  });
  it('an ordinary member cannot change roles', async () => {
    expect(await affected(USER.member, setRole('admin', USER.member))).toBe(0);
  });
  it('identity columns are immutable (ADR-019)', async () => {
    await denied(USER.owner, 'privilege', `update members set user_id = $1 where user_id = $2`, [
      USER.outsider,
      USER.member,
    ]);
  });
});

describe('members: removing (ADR-016)', () => {
  it('a secondary admin can remove an ordinary member', async () => {
    expect(await affected(USER.admin2, remove(USER.member))).toBe(1);
  });
  it('a secondary admin cannot remove the primary admin', async () => {
    expect(await affected(USER.admin2, remove(USER.owner))).toBe(0);
  });
  it('the primary admin can remove another admin', async () => {
    expect(await affected(USER.owner, remove(USER.admin2))).toBe(1);
  });
  it('nobody can remove the primary admin, not even themselves', async () => {
    expect(await affected(USER.owner, remove(USER.owner))).toBe(0);
  });
  it('an ordinary member cannot remove anybody', async () => {
    expect(await affected(USER.member, remove(USER.admin2))).toBe(0);
  });
});
