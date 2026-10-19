import { describe, expect, it } from 'vitest';
import { as, failure } from './helpers';
import { ACCOUNT, TX, USER } from './fixtures';

// change_account_visibility (ADR-015, ADR-035): changes who sees an account and,
// in the same transaction, the movements the owner chose to bring along. It runs
// as the caller (SECURITY INVOKER), so RLS and column grants still apply.
// Fixtures: ACCOUNT.memberPrivate (private, owned by `member`) holds
// TX.memberSharedOnPrivate (shared) and TX.memberPrivate (private), booked
// on 2026-10-01 and not set by hand.

const call = `select change_account_visibility($1, $2, $3, $4) as changed`;

const visibilityOf = async (
  db: import('pg').PoolClient,
  table: 'accounts' | 'transactions',
  id: string,
) => (await db.query(`select visibility from ${table} where id = $1`, [id])).rows[0].visibility;

describe('change_account_visibility', () => {
  it('makes the account shared and brings the private movements along', async () => {
    await as(USER.member, async (db) => {
      const { rows } = await db.query(call, [ACCOUNT.memberPrivate, 'shared', true, null]);
      expect(rows[0].changed).toBe(1); // only TX.memberPrivate was not shared yet
      expect(await visibilityOf(db, 'accounts', ACCOUNT.memberPrivate)).toBe('shared');
      expect(await visibilityOf(db, 'transactions', TX.memberPrivate)).toBe('shared');
    });
  });

  it('"solo da ora" changes the account and no existing movement', async () => {
    await as(USER.member, async (db) => {
      const { rows } = await db.query(call, [ACCOUNT.memberPrivate, 'shared', false, null]);
      expect(rows[0].changed).toBe(0);
      expect(await visibilityOf(db, 'accounts', ACCOUNT.memberPrivate)).toBe('shared');
      expect(await visibilityOf(db, 'transactions', TX.memberPrivate)).toBe('private');
    });
  });

  it('"da una data" only moves movements booked on or after it', async () => {
    await as(USER.member, async (db) => {
      const after = await db.query(call, [ACCOUNT.memberPrivate, 'shared', true, '2026-10-02']);
      expect(after.rows[0].changed).toBe(0);
      expect(await visibilityOf(db, 'transactions', TX.memberPrivate)).toBe('private');
      const on = await db.query(call, [ACCOUNT.memberPrivate, 'shared', true, '2026-10-01']);
      expect(on.rows[0].changed).toBe(1);
      expect(await visibilityOf(db, 'transactions', TX.memberPrivate)).toBe('shared');
    });
  });

  it('never moves a movement whose visibility was chosen by hand', async () => {
    await as(USER.member, async (db) => {
      await db.query('update transactions set visibility_overridden = true where id = $1', [
        TX.memberPrivate,
      ]);
      const { rows } = await db.query(call, [ACCOUNT.memberPrivate, 'shared', true, null]);
      expect(rows[0].changed).toBe(0);
      expect(await visibilityOf(db, 'transactions', TX.memberPrivate)).toBe('private');
    });
  });

  it('going private brings the shared movements along too', async () => {
    await as(USER.member, async (db) => {
      await db.query(call, [ACCOUNT.memberPrivate, 'shared', true, null]);
      const { rows } = await db.query(call, [ACCOUNT.memberPrivate, 'private', true, null]);
      expect(rows[0].changed).toBe(2);
      expect(await visibilityOf(db, 'transactions', TX.memberSharedOnPrivate)).toBe('private');
      expect(await visibilityOf(db, 'accounts', ACCOUNT.memberPrivate)).toBe('private');
    });
  });
});

describe('change_account_visibility: who may call it', () => {
  it.each([
    ['another member of the family', USER.owner],
    ['an admin (no exception for private accounts)', USER.admin2],
    ['a member of another family', USER.owner2],
  ])('%s gets "not found", and nothing changes', async (_who, actor) => {
    await as(actor, async (db) => {
      const error = await failure(db, call, [ACCOUNT.memberPrivate, 'shared', true, null]);
      expect(error.code).toBe('P0002');
      expect(error.message).toMatch(/account_not_found/);
    });
    await as('service', async (db) => {
      expect(await visibilityOf(db, 'accounts', ACCOUNT.memberPrivate)).toBe('private');
      expect(await visibilityOf(db, 'transactions', TX.memberPrivate)).toBe('private');
    });
  });

  it('rejects a visibility that is neither private nor shared, before writing anything', async () => {
    await as(USER.member, async (db) => {
      const error = await failure(db, call, [ACCOUNT.memberPrivate, 'public', true, null]);
      expect(error.code).toBe('22023');
      expect(await visibilityOf(db, 'accounts', ACCOUNT.memberPrivate)).toBe('private');
    });
  });

  it('is not callable when logged out', async () => {
    await as('anon', async (db) => {
      const error = await failure(db, call, [ACCOUNT.memberPrivate, 'shared', true, null]);
      expect(error.code).toBe('42501');
    });
  });
});
