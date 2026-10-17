import { describe, expect, it } from 'vitest';
import { affected, as, denied, deniedAfter } from './helpers';
import { ACCOUNT, H1, IMPORT, TX, USER } from './fixtures';

// ADR-033: deleting an account deletes its private transactions and keeps the
// shared ones (account_id -> null). Every case runs in a rolled-back transaction.
const deleteAccount = 'delete from accounts where id = $1';
const txAccount = `select account_id from transactions where id = $1`;

describe('deleting an account (ADR-033)', () => {
  it("the owner's delete removes private transactions and keeps shared ones, without an account", async () => {
    await as(USER.owner, async (db) => {
      await db.query(deleteAccount, [ACCOUNT.ownerShared]);

      const kept = await db.query(txAccount, [TX.ownerShared]);
      expect(kept.rows).toEqual([{ account_id: null }]);

      const removed = await db.query('select 1 from transactions where id = $1', [TX.ownerPrivate]);
      expect(removed.rowCount).toBe(0);
    });
  });

  it('the visibility of the transaction decides, not the one of the account', async () => {
    // memberPrivate is a private account: its shared transaction (ADR-015
    // override) survives, its private one goes.
    await as(USER.member, async (db) => {
      await db.query(deleteAccount, [ACCOUNT.memberPrivate]);
      expect((await db.query(txAccount, [TX.memberSharedOnPrivate])).rows).toEqual([
        { account_id: null },
      ]);
      expect((await db.query(txAccount, [TX.memberPrivate])).rowCount).toBe(0);
    });
  });

  it('the surviving shared transaction is still visible to the rest of the household', async () => {
    // Delete as the owner of the account, then read as somebody else, in one transaction.
    const asOwnerSees = await as(USER.member, async (db) => {
      await db.query(deleteAccount, [ACCOUNT.memberPrivate]);
      await db.query('reset role');
      await db.query(`select set_config('request.jwt.claims', $1, true)`, [
        JSON.stringify({ sub: USER.owner, role: 'authenticated' }),
      ]);
      await db.query('set local role authenticated');
      return (
        await db.query('select id from transactions where id = $1', [TX.memberSharedOnPrivate])
      ).rows;
    });
    expect(asOwnerSees).toEqual([{ id: TX.memberSharedOnPrivate }]);
  });

  it('imports survive with their counters, without an account', async () => {
    await as(USER.owner, async (db) => {
      await db.query(deleteAccount, [ACCOUNT.ownerShared]);
      const res = await db.query('select account_id from imports where id = $1', [IMPORT.h1]);
      expect(res.rows).toEqual([{ account_id: null }]);
    });
  });

  it("an admin deleting somebody else's shared account does not destroy the owner's private transactions", async () => {
    await as(USER.admin2, async (db) => {
      expect((await db.query(deleteAccount, [ACCOUNT.ownerShared])).rowCount).toBe(1);
      // the shared one is still there for the admin...
      expect((await db.query(txAccount, [TX.ownerShared])).rows).toEqual([{ account_id: null }]);
      // ...the owner's private one was never theirs to see or delete
      expect((await db.query(txAccount, [TX.ownerPrivate])).rowCount).toBe(0);
      // but it still exists (checked without RLS), orphaned
      await db.query('reset role');
      expect((await db.query(txAccount, [TX.ownerPrivate])).rows).toEqual([{ account_id: null }]);
      // and the owner can still see it, with RLS back on
      await db.query(`select set_config('request.jwt.claims', $1, true)`, [
        JSON.stringify({ sub: USER.owner, role: 'authenticated' }),
      ]);
      await db.query('set local role authenticated');
      expect((await db.query(txAccount, [TX.ownerPrivate])).rows).toEqual([{ account_id: null }]);
      // while another member still cannot see it
      await db.query(`select set_config('request.jwt.claims', $1, true)`, [
        JSON.stringify({ sub: USER.member, role: 'authenticated' }),
      ]);
      expect((await db.query(txAccount, [TX.ownerPrivate])).rowCount).toBe(0);
    });
  });

  it('nobody outside the household can delete its accounts, and nothing is touched', async () => {
    for (const actor of [USER.owner2, USER.outsider]) {
      await as(actor, async (db) => {
        expect((await db.query(deleteAccount, [ACCOUNT.ownerShared])).rowCount).toBe(0);
        await db.query('reset role');
        expect((await db.query(txAccount, [TX.ownerPrivate])).rows).toEqual([
          { account_id: ACCOUNT.ownerShared },
        ]);
        expect(
          (await db.query('select account_id from imports where id = $1', [IMPORT.h1])).rows,
        ).toEqual([{ account_id: ACCOUNT.ownerShared }]);
      });
    }
    expect(await affected('anon', deleteAccount, [ACCOUNT.ownerShared])).toBe(0);
  });

  it("not even an admin can delete somebody else's private account", async () => {
    for (const actor of [USER.owner, USER.admin2]) {
      await as(actor, async (db) => {
        expect((await db.query(deleteAccount, [ACCOUNT.memberPrivate])).rowCount).toBe(0);
        await db.query('reset role');
        for (const tx of [TX.memberPrivate, TX.memberSharedOnPrivate]) {
          expect((await db.query(txAccount, [tx])).rows).toEqual([
            { account_id: ACCOUNT.memberPrivate },
          ]);
        }
      });
    }
  });

  it("a member cannot delete somebody else's account, so nothing is deleted", async () => {
    await as(USER.member, async (db) => {
      expect((await db.query(deleteAccount, [ACCOUNT.ownerShared])).rowCount).toBe(0);
      expect((await db.query(txAccount, [TX.ownerShared])).rows).toEqual([
        { account_id: ACCOUNT.ownerShared },
      ]);
    });
  });
});

describe('transactions without an account (ADR-033)', () => {
  it('cannot be inserted: owns_account(null) is false', async () => {
    await denied(
      USER.member,
      'rls',
      `insert into transactions (household_id, account_id, owner_id, booked_on, amount_cents, description, raw_description)
       values ($1, null, $2, '2026-10-01', -100, 't', 't')`,
      [H1, USER.member],
    );
  });

  it('cannot be re-attached to an account by updating account_id (ADR-019)', async () => {
    await as('service', async (db) => {
      await db.query('update transactions set account_id = null where id = $1', [TX.ownerShared]);
      await db.query(`select set_config('request.jwt.claims', $1, true)`, [
        JSON.stringify({ sub: USER.owner, role: 'authenticated' }),
      ]);
      await db.query('set local role authenticated');
      await db.query('savepoint s');
      await expect(
        db.query('update transactions set account_id = $2 where id = $1', [
          TX.ownerShared,
          ACCOUNT.ownerShared,
        ]),
      ).rejects.toMatchObject({ code: '42501' });
    });
  });
});

describe('accounts: constraints added in task 1.5a', () => {
  const insert = `insert into accounts (household_id, name, kind, owner_id, bank_format)
                  values ($1, $2, $3, $4, $5)`;

  it('a cash account cannot have a bank format (ADR-025)', async () => {
    await denied(USER.member, 'check', insert, [H1, 'Cassa', 'cash', USER.member, 'revolut']);
  });

  it('bank_format is free text: any preset id is accepted by the database (validated in src/domain)', async () => {
    await as(USER.member, async (db) => {
      const res = await db.query(insert, [H1, 'Nuovo', 'bank', USER.member, 'unicredit']);
      expect(res.rowCount).toBe(1);
    });
  });

  it('an owner cannot have two accounts with the same name, ignoring case', async () => {
    await deniedAfter(
      USER.member,
      'unique',
      [[insert, [H1, 'Revolut', 'bank', USER.member, null]]],
      insert,
      [H1, 'revolut', 'card', USER.member, null],
    );
  });

  it('two different owners may use the same name', async () => {
    // Each `as` is rolled back, so both inserts share one transaction (as postgres).
    await as('service', async (db) => {
      await db.query(insert, [H1, 'Revolut', 'bank', USER.owner, null]);
      const res = await db.query(insert, [H1, 'Revolut', 'bank', USER.member, null]);
      expect(res.rowCount).toBe(1);
    });
  });
});
