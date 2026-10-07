import { describe, expect, it } from 'vitest';
import { affected, denied, ids, rows } from './helpers';
import { ACCOUNT, CATEGORY, H1, TX, USER } from './fixtures';

const sorted = (...a: string[]) => [...a].sort();

describe('transactions: who sees what (ADR-015)', () => {
  it('everyone sees shared transactions plus their own private ones', async () => {
    expect(await ids(USER.member, 'transactions')).toEqual(
      sorted(TX.ownerShared, TX.memberSharedOnPrivate, TX.memberPrivate),
    );
    expect(await ids(USER.owner, 'transactions')).toEqual(
      sorted(TX.ownerShared, TX.memberSharedOnPrivate, TX.ownerPrivate),
    );
  });
  it('admins get no exception for private transactions', async () => {
    const seen = await ids(USER.admin2, 'transactions');
    expect(seen).not.toContain(TX.memberPrivate);
    expect(seen).not.toContain(TX.ownerPrivate);
  });
  it('a shared transaction on a private account is visible, the account is not', async () => {
    expect(await ids(USER.owner, 'transactions')).toContain(TX.memberSharedOnPrivate);
    expect(await ids(USER.owner, 'accounts')).not.toContain(ACCOUNT.memberPrivate);
  });
  it('new transactions are private by default', async () => {
    const [tx] = await rows(
      'service',
      `insert into transactions (household_id, account_id, owner_id, booked_on, amount_cents, description, raw_description)
       values ($1, $2, $3, '2026-10-02', -5, 'x', 'x') returning visibility, visibility_overridden`,
      [H1, ACCOUNT.memberPrivate, USER.member],
    );
    expect(tx).toEqual({ visibility: 'private', visibility_overridden: false });
  });
});

describe('transactions: inserting', () => {
  const insert = (visibility = 'private') =>
    `insert into transactions (household_id, account_id, owner_id, booked_on, amount_cents, description, raw_description, visibility)
     values ($1, $2, $3, '2026-10-02', -5, 'x', 'x', '${visibility}')`;

  it('a member can add to their own account', async () => {
    expect(await affected(USER.member, insert(), [H1, ACCOUNT.memberPrivate, USER.member])).toBe(1);
  });
  it('and can declare it shared even on a private account (ADR-015)', async () => {
    expect(
      await affected(USER.member, insert('shared'), [H1, ACCOUNT.memberPrivate, USER.member]),
    ).toBe(1);
  });
  it("but not into somebody else's account, even a shared one", async () => {
    await denied(USER.member, 'rls', insert(), [H1, ACCOUNT.ownerShared, USER.member]);
  });
  it('and not with somebody else as owner', async () => {
    await denied(USER.member, 'rls', insert(), [H1, ACCOUNT.memberPrivate, USER.owner]);
  });
  it('an outsider cannot insert anywhere', async () => {
    await denied(USER.outsider, 'rls', insert(), [H1, ACCOUNT.memberPrivate, USER.outsider]);
  });
});

describe('transactions: updating', () => {
  it('a member can recategorise a shared transaction of somebody else', async () => {
    expect(
      await affected(USER.member, 'update transactions set category_id = $2 where id = $1', [
        TX.ownerShared,
        CATEGORY.h1,
      ]),
    ).toBe(1);
  });
  it("but cannot make it private: it would become invisible to them and isn't theirs", async () => {
    await denied(
      USER.member,
      'rls',
      `update transactions set visibility = 'private' where id = $1`,
      [TX.ownerShared],
    );
  });
  it('and cannot take it over by changing owner_id (ADR-019)', async () => {
    await denied(USER.member, 'privilege', 'update transactions set owner_id = $2 where id = $1', [
      TX.ownerShared,
      USER.member,
    ]);
  });
  it('account_id and household_id are immutable too', async () => {
    await denied(
      USER.member,
      'privilege',
      'update transactions set account_id = $2 where id = $1',
      [TX.memberPrivate, ACCOUNT.memberShared],
    );
  });
  it("private transactions of others cannot be touched: they don't exist for the actor", async () => {
    expect(
      await affected(USER.admin2, 'update transactions set needs_review = true where id = $1', [
        TX.memberPrivate,
      ]),
    ).toBe(0);
  });
  it('the owner can share their own private transaction, recording the manual choice', async () => {
    expect(
      await affected(
        USER.member,
        `update transactions set visibility = 'shared', visibility_overridden = true where id = $1`,
        [TX.memberPrivate],
      ),
    ).toBe(1);
  });
  it('a transfer recipient can be set (ADR-015)', async () => {
    expect(
      await affected(USER.owner, 'update transactions set transfer_member_id = $2 where id = $1', [
        TX.ownerShared,
        USER.member,
      ]),
    ).toBe(1);
  });
});

describe('transactions: deleting', () => {
  const del = 'delete from transactions where id = $1';
  it('the owner can delete their own', async () => {
    expect(await affected(USER.member, del, [TX.memberPrivate])).toBe(1);
  });
  it('an admin can delete a shared transaction of somebody else', async () => {
    expect(await affected(USER.admin2, del, [TX.memberSharedOnPrivate])).toBe(1);
  });
  it('an ordinary member cannot delete a shared transaction of somebody else', async () => {
    expect(await affected(USER.member, del, [TX.ownerShared])).toBe(0);
  });
  it("nobody can delete somebody else's private transaction, admins included", async () => {
    expect(await affected(USER.admin2, del, [TX.memberPrivate])).toBe(0);
    expect(await affected(USER.owner, del, [TX.memberPrivate])).toBe(0);
  });
});
