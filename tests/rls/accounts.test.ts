import { describe, expect, it } from 'vitest';
import { affected, denied, ids, rows } from './helpers';
import { ACCOUNT, H1, USER } from './fixtures';

const sorted = (...a: string[]) => [...a].sort();

describe('accounts: who sees what (ADR-015)', () => {
  it('everyone sees shared accounts plus their own private ones', async () => {
    expect(await ids(USER.member, 'accounts')).toEqual(
      sorted(ACCOUNT.ownerShared, ACCOUNT.memberShared, ACCOUNT.memberPrivate),
    );
  });
  it('admins get no exception: a private account of someone else stays invisible', async () => {
    expect(await ids(USER.owner, 'accounts')).toEqual(
      sorted(ACCOUNT.ownerShared, ACCOUNT.memberShared),
    );
    expect(await ids(USER.admin2, 'accounts')).toEqual(
      sorted(ACCOUNT.ownerShared, ACCOUNT.memberShared, ACCOUNT.admin2Private),
    );
  });
  it('new accounts are private by default', async () => {
    const [account] = await rows(
      'service',
      `insert into accounts (household_id, name, kind, owner_id) values ($1, 'x', 'bank', $2) returning visibility`,
      [H1, USER.member],
    );
    expect(account.visibility).toBe('private');
  });
});

describe('accounts: creating', () => {
  const insert = `insert into accounts (household_id, name, kind, owner_id) values ($1, 'x', 'card', $2)`;
  it('a member can register their own account', async () => {
    expect(await affected(USER.member, insert, [H1, USER.member])).toBe(1);
  });
  it('but not an account owned by somebody else', async () => {
    await denied(USER.member, 'rls', insert, [H1, USER.owner]);
  });
  it('and not in a household they do not belong to', async () => {
    await denied(USER.outsider, 'rls', insert, [H1, USER.outsider]);
  });
});

describe('accounts: updating and deleting', () => {
  const rename = `update accounts set name = 'x' where id = $1`;
  const makePrivate = `update accounts set visibility = 'private' where id = $1`;

  it('the owner can change their account, including its visibility', async () => {
    expect(await affected(USER.member, rename, [ACCOUNT.memberPrivate])).toBe(1);
    expect(
      await affected(USER.member, `update accounts set visibility = 'shared' where id = $1`, [
        ACCOUNT.memberPrivate,
      ]),
    ).toBe(1);
  });
  it("an admin can manage somebody else's shared account", async () => {
    expect(await affected(USER.admin2, rename, [ACCOUNT.ownerShared])).toBe(1);
  });
  it('but cannot make it private (it would vanish from their own view)', async () => {
    await denied(USER.admin2, 'rls', makePrivate, [ACCOUNT.ownerShared]);
  });
  it("an admin cannot touch somebody else's private account", async () => {
    expect(await affected(USER.admin2, rename, [ACCOUNT.memberPrivate])).toBe(0);
    expect(
      await affected(USER.owner, 'delete from accounts where id = $1', [ACCOUNT.memberPrivate]),
    ).toBe(0);
  });
  it("an ordinary member cannot touch somebody else's shared account", async () => {
    expect(await affected(USER.member, rename, [ACCOUNT.ownerShared])).toBe(0);
    expect(
      await affected(USER.member, 'delete from accounts where id = $1', [ACCOUNT.ownerShared]),
    ).toBe(0);
  });
  it('the owner can delete their own account (when nothing references it)', async () => {
    expect(
      await affected(USER.member, 'delete from accounts where id = $1', [ACCOUNT.memberShared]),
    ).toBe(1);
  });
  it('owner_id and household_id are immutable (ADR-019)', async () => {
    await denied(USER.member, 'privilege', 'update accounts set owner_id = $2 where id = $1', [
      ACCOUNT.memberPrivate,
      USER.owner,
    ]);
    await denied(USER.member, 'privilege', 'update accounts set household_id = $2 where id = $1', [
      ACCOUNT.memberPrivate,
      USER.owner,
    ]);
  });
});
