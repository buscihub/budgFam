import { describe, expect, it } from 'vitest';
import { as, failure } from './helpers';
import { ACCOUNT, H1, USER } from './fixtures';

// undo_import (ADR-027): deletes the rows of one import and marks it 'undone' in
// one transaction, and only for the person who uploaded the file. It runs as the
// caller (SECURITY INVOKER), so RLS still applies.

const newImport = (status: string) =>
  `insert into imports (household_id, account_id, uploaded_by, file_name, rows_inserted, status)
   values ($1, $2, $3, 'revolut.csv', 2, '${status}') returning id`;

const insertRow = (tag: string) =>
  `insert into transactions (household_id, account_id, import_id, owner_id, booked_on, amount_cents,
                             description, raw_description, import_hash)
   values ($1, $2, $3, $4, '2026-10-02', -120, 'BAR', 'Bar', 'undo-${tag}')`;

async function seed(db: import('pg').PoolClient, status = 'done') {
  const {
    rows: [imp],
  } = await db.query(newImport(status), [H1, ACCOUNT.memberShared, USER.member]);
  for (const n of ['1', '2']) {
    // The hash is unique per household: tie it to the import so seeds do not clash.
    await db.query(insertRow(`${imp.id}-${n}`), [H1, ACCOUNT.memberShared, imp.id, USER.member]);
  }
  return imp.id as string;
}

const undo = 'select undo_import($1) as removed';
const countRows = async (db: import('pg').PoolClient, importId: string) =>
  (await db.query('select count(*)::int as n from transactions where import_id = $1', [importId]))
    .rows[0].n;
const statusOf = async (db: import('pg').PoolClient, importId: string) =>
  (await db.query('select status, rows_inserted from imports where id = $1', [importId])).rows[0];

describe('undo_import', () => {
  it('the uploader removes the rows of that import and marks it undone, counters intact', async () => {
    await as(USER.member, async (db) => {
      const id = await seed(db);
      const other = await seed(db);
      const manual = await db.query(
        `insert into transactions (household_id, account_id, owner_id, booked_on, amount_cents, description, raw_description)
         values ($1, $2, $3, '2026-10-02', -5, 'manual', 'manual') returning id`,
        [H1, ACCOUNT.memberShared, USER.member],
      );

      const { rows } = await db.query(undo, [id]);
      expect(rows[0].removed).toBe(2);
      expect(await countRows(db, id)).toBe(0);
      expect(await statusOf(db, id)).toEqual({ status: 'undone', rows_inserted: 2 });
      // Neither another import nor a manual movement is touched.
      expect(await countRows(db, other)).toBe(2);
      const still = await db.query('select 1 from transactions where id = $1', [manual.rows[0].id]);
      expect(still.rowCount).toBe(1);
    });
  });

  it('an import already undone cannot be undone again', async () => {
    await as(USER.member, async (db) => {
      const id = await seed(db);
      await db.query(undo, [id]);
      const error = await failure(db, undo, [id]);
      expect(error.code).toBe('P0001');
      expect(error.message).toMatch(/already_undone/);
    });
  });

  it.each(['processing', 'failed'])('an import that is %s cannot be undone', async (status) => {
    await as(USER.member, async (db) => {
      const id = await seed(db, status);
      const error = await failure(db, undo, [id]);
      expect(error.message).toMatch(/not_undoable/);
      expect(await countRows(db, id)).toBe(2);
    });
  });
});

// The function locks the import row (SELECT ... FOR UPDATE), which the update
// policy only allows to the uploader: anybody else gets "not found" (P0002)
// without learning that the import exists. The explicit uploader check inside
// the function (42501) stays as a second line of defence.
describe('undo_import: only the uploader', () => {
  it.each([
    ['another member', USER.owner],
    ['an admin who did not upload it', USER.admin2],
  ])('%s is refused, and nothing changes', async (_who, actor) => {
    let id = '';
    await as('service', async (db) => {
      id = await seed(db);
      await db.query('set local role authenticated');
      await db.query(`select set_config('request.jwt.claims', $1, true)`, [
        JSON.stringify({ sub: actor, role: 'authenticated' }),
      ]);
      const error = await failure(db, undo, [id]);
      expect(error.code).toBe('P0002');
      await db.query('reset role');
      expect(await countRows(db, id)).toBe(2);
      expect((await statusOf(db, id)).status).toBe('done');
    });
  });

  it('a member of another family does not even see the import', async () => {
    let id = '';
    await as('service', async (db) => {
      id = await seed(db);
      await db.query('set local role authenticated');
      await db.query(`select set_config('request.jwt.claims', $1, true)`, [
        JSON.stringify({ sub: USER.owner2, role: 'authenticated' }),
      ]);
      const error = await failure(db, undo, [id]);
      expect(error.code).toBe('P0002');
    });
  });

  it('is not callable when logged out', async () => {
    await as('anon', async (db) => {
      const error = await failure(db, undo, ['00000000-0000-0000-0000-000000000000']);
      expect(error.code).toBe('42501');
    });
  });
});
