import { describe, expect, it } from 'vitest';
import { as, denied } from './helpers';
import { ACCOUNT, H1, USER } from './fixtures';

// Task 1.5 / ADR-027: the import flow acts as the signed-in member, so what
// it needs (create a run, insert rows, delete them on undo) must work under
// RLS, and nothing more.

const insertImport = `insert into imports (household_id, account_id, uploaded_by, file_name)
  values ($1, $2, $3, 'revolut.csv') returning id`;

const insertTx = (suffix: string) =>
  `insert into transactions (household_id, account_id, import_id, owner_id, booked_on, amount_cents,
                             description, raw_description, import_hash)
   values ($1, $2, $3, $4, '2026-10-02', -120, 'BAR', 'Bar', 'hash-${suffix}')`;

describe('imports: status (ADR-027)', () => {
  it("accepts 'undone' and rejects unknown statuses", async () => {
    await as(USER.member, async (db) => {
      const {
        rows: [imp],
      } = await db.query(insertImport, [H1, ACCOUNT.memberShared, USER.member]);
      await db.query(`update imports set status = 'undone' where id = $1`, [imp.id]);
    });
    await denied(
      USER.member,
      'check',
      `insert into imports (household_id, account_id, uploaded_by, file_name, status)
       values ($1, $2, $3, 'x.csv', 'cancelled')`,
      [H1, ACCOUNT.memberShared, USER.member],
    );
  });
});

describe('imports: writing the rows and undoing them', () => {
  it('a member imports into their own account, and re-importing the same hash is refused', async () => {
    await as(USER.member, async (db) => {
      const {
        rows: [imp],
      } = await db.query(insertImport, [H1, ACCOUNT.memberShared, USER.member]);
      await db.query(insertTx('a'), [H1, ACCOUNT.memberShared, imp.id, USER.member]);
      await db.query('savepoint again');
      await expect(
        db.query(insertTx('a'), [H1, ACCOUNT.memberShared, imp.id, USER.member]),
      ).rejects.toMatchObject({ code: '23505' });
    });
  });

  it('undo deletes only the rows of that import, not manual ones nor other imports', async () => {
    await as(USER.member, async (db) => {
      const make = async () =>
        (await db.query(insertImport, [H1, ACCOUNT.memberShared, USER.member])).rows[0]
          .id as string;
      const first = await make();
      const second = await make();
      await db.query(insertTx('one'), [H1, ACCOUNT.memberShared, first, USER.member]);
      await db.query(insertTx('two'), [H1, ACCOUNT.memberShared, second, USER.member]);
      await db.query(
        `insert into transactions (household_id, account_id, owner_id, booked_on, amount_cents, description, raw_description)
         values ($1, $2, $3, '2026-10-02', -5, 'manual', 'manual')`,
        [H1, ACCOUNT.memberShared, USER.member],
      );

      const removed = await db.query('delete from transactions where import_id = $1', [first]);
      expect(removed.rowCount).toBe(1);
      await db.query(`update imports set status = 'undone' where id = $1`, [first]);

      const other = await db.query('select 1 from transactions where import_id = $1', [second]);
      expect(other.rowCount).toBe(1);
      const manual = await db.query(`select 1 from transactions where description = 'manual'`);
      expect(manual.rowCount).toBe(1);
      const counters = await db.query('select status from imports where id = $1', [first]);
      expect(counters.rows[0].status).toBe('undone');
    });
  });

  it("another member cannot delete the importer's private rows (the app checks ownership too)", async () => {
    let importId = '';
    await as('service', async (db) => {
      const {
        rows: [imp],
      } = await db.query(insertImport, [H1, ACCOUNT.memberPrivate, USER.member]);
      importId = imp.id;
      await db.query(insertTx('priv'), [H1, ACCOUNT.memberPrivate, importId, USER.member]);
      // Same transaction (rolled back at the end): now act as another member.
      await db.query('set local role authenticated');
      await db.query(`select set_config('request.jwt.claims', $1, true)`, [
        JSON.stringify({ sub: USER.admin2, role: 'authenticated' }),
      ]);
      const res = await db.query('delete from transactions where import_id = $1', [importId]);
      expect(res.rowCount).toBe(0); // private to the importer: invisible, so untouched
    });
  });
});
