import { describe, expect, it } from 'vitest';
import { affected, as, denied } from './helpers';
import { ACCOUNT, H1, IMPORT, USER } from './fixtures';

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

describe('imports: who writes what (review of 1.5, ADR-019)', () => {
  const insertAs = `insert into imports (household_id, account_id, uploaded_by, file_name)
    values ($1, $2, $3, 'x.csv')`;

  it('an import is created as yourself, for your own account', async () => {
    expect(await affected(USER.member, insertAs, [H1, ACCOUNT.memberPrivate, USER.member])).toBe(1);
  });
  it('and without an account at all (as after an account is deleted)', async () => {
    expect(await affected(USER.member, insertAs, [H1, null, USER.member])).toBe(1);
  });
  it('not as somebody else', async () => {
    await denied(USER.member, 'rls', insertAs, [H1, ACCOUNT.memberPrivate, USER.owner]);
  });
  it("not for somebody else's account, shared or private", async () => {
    await denied(USER.member, 'rls', insertAs, [H1, ACCOUNT.ownerShared, USER.member]);
    await denied(USER.owner, 'rls', insertAs, [H1, ACCOUNT.memberPrivate, USER.owner]);
  });
  it('not in another family', async () => {
    await denied(USER.owner2, 'rls', insertAs, [H1, ACCOUNT.h2Shared, USER.owner2]);
  });

  describe('updating', () => {
    const setOwn = (column: string, value: string) =>
      `update imports set ${column} = '${value}' where id = $1`;

    it('the uploader moves status, error and counters', async () => {
      await as(USER.owner, async (db) => {
        const res = await db.query(
          `update imports set status = 'failed', error = 'x', rows_read = 3, rows_inserted = 2,
                              rows_duplicate = 1, by_ai = 1, ai_tokens_in = 10 where id = $1`,
          [IMPORT.h1],
        );
        expect(res.rowCount).toBe(1);
      });
    });
    it.each(['file_name', 'created_at'])('but not %s', async (column) => {
      const value = column === 'created_at' ? '2020-01-01' : 'renamed.csv';
      await denied(USER.owner, 'privilege', setOwn(column, value), [IMPORT.h1]);
    });
    it.each([
      ['account_id', ACCOUNT.ownerShared],
      ['uploaded_by', USER.member],
      ['household_id', H1],
    ])('and not %s', async (column, value) => {
      await denied(USER.owner, 'privilege', setOwn(column, value), [IMPORT.h1]);
    });
    it('a member of another family touches nothing', async () => {
      expect(
        await affected(USER.owner2, `update imports set status = 'done' where id = $1`, [
          IMPORT.h1,
        ]),
      ).toBe(0);
    });
  });
});

// The import writes rows with INSERT ... ON CONFLICT DO NOTHING on
// (household_id, import_hash) (PostgREST upsert with ignoreDuplicates): rows
// already stored are skipped, the others go in, and an undone import frees its
// hashes so the same file can be imported again (§8.3, ADR-009, ADR-027).
describe('importing: the unique hash and ON CONFLICT DO NOTHING', () => {
  const batch = `insert into transactions (household_id, account_id, import_id, owner_id, booked_on,
                   amount_cents, description, raw_description, import_hash)
                 select $1, $2, $3, $4, '2026-10-02', -120, 'BAR', 'Bar', h
                   from unnest($5::text[]) as h
                 on conflict (household_id, import_hash) do nothing returning id`;

  it('inserts only the hashes not stored yet, and a re-run inserts none', async () => {
    await as(USER.member, async (db) => {
      const {
        rows: [imp],
      } = await db.query(insertImport, [H1, ACCOUNT.memberShared, USER.member]);
      const args = (hashes: string[]) => [H1, ACCOUNT.memberShared, imp.id, USER.member, hashes];
      expect((await db.query(batch, args(['i-a', 'i-b']))).rowCount).toBe(2);
      expect((await db.query(batch, args(['i-a', 'i-b']))).rowCount).toBe(0); // reimport
      expect((await db.query(batch, args(['i-b', 'i-c']))).rowCount).toBe(1); // overlap
    });
  });

  it('after undo_import the same file can be imported again', async () => {
    await as(USER.member, async (db) => {
      const {
        rows: [imp],
      } = await db.query(insertImport, [H1, ACCOUNT.memberShared, USER.member]);
      const args = [H1, ACCOUNT.memberShared, imp.id, USER.member, ['r-a', 'r-b']];
      expect((await db.query(batch, args)).rowCount).toBe(2);
      await db.query(`update imports set status = 'done' where id = $1`, [imp.id]);
      await db.query('select undo_import($1)', [imp.id]);
      expect((await db.query(batch, args)).rowCount).toBe(2);
    });
  });
});

// A DELETE with no WHERE never reads a column, so Postgres may skip the SELECT
// policy: an admin must still not be able to wipe other people's private rows
// (§7: admins get no exception for private movements).
describe('transactions: a delete with no condition', () => {
  it('does not reach private movements of somebody else, not even for an admin', async () => {
    await as(USER.admin2, async (db) => {
      // Rows the admin may see (shared, or their own): the most a delete may reach.
      const visible = (await db.query('select count(*)::int as n from transactions')).rows[0].n;
      // No WHERE and no RETURNING: nothing in the statement reads a column.
      const deleted = (await db.query('delete from transactions')).rowCount;
      expect(deleted).toBeLessThanOrEqual(visible);
    });
    await as('service', async (db) => {
      const { rowCount } = await db.query('select 1 from transactions');
      expect(rowCount).toBeGreaterThan(0);
    });
  });
});
