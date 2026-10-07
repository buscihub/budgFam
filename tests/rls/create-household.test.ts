import { describe, expect, it } from 'vitest';
import { as, asOnEmptyInstance, failure } from './helpers';
import { USER } from './fixtures';

const create = `select create_household($1, $2) as id`;

describe('create_household (ADR-022)', () => {
  it('creates the household, its first admin and the seed categories in one go', async () => {
    await asOnEmptyInstance(USER.outsider, async (db) => {
      const { rows } = await db.query(create, ['Famiglia Rossi', 'Federico']);
      const id = rows[0].id;

      const household = await db.query('select name, owner_id from households where id = $1', [id]);
      expect(household.rows).toEqual([{ name: 'Famiglia Rossi', owner_id: USER.outsider }]);

      const members = await db.query(
        'select user_id, display_name, role from members where household_id = $1',
        [id],
      );
      expect(members.rows).toEqual([
        { user_id: USER.outsider, display_name: 'Federico', role: 'admin' },
      ]);
    });
  });

  it('seeds the categories of DESIGN_DOC §6.1', async () => {
    await asOnEmptyInstance(USER.outsider, async (db) => {
      await db.query(create, ['Famiglia', 'Federico']);
      const { rows } = await db.query(
        'select kind, count(*)::int as n from categories group by kind order by kind',
      );
      expect(rows).toEqual([
        { kind: 'excluded', n: 1 },
        { kind: 'expense', n: 15 },
        { kind: 'income', n: 3 },
        { kind: 'transfer', n: 5 },
      ]);
      const excluded = await db.query(`select name from categories where kind = 'excluded'`);
      expect(excluded.rows).toEqual([{ name: 'B&B' }]);
      const hidden = await db.query('select count(*)::int as n from categories where is_hidden');
      expect(hidden.rows[0].n).toBe(0);
    });
  });

  it('makes the caller see their new household through normal RLS', async () => {
    await asOnEmptyInstance(USER.outsider, async (db) => {
      await db.query(create, ['Famiglia', 'Federico']);
      expect((await db.query('select count(*)::int as n from households')).rows[0].n).toBe(1);
      expect((await db.query('select count(*)::int as n from categories')).rows[0].n).toBe(24);
    });
  });

  it('trims the names', async () => {
    await asOnEmptyInstance(USER.outsider, async (db) => {
      await db.query(create, ['  Famiglia  ', '  Federico ']);
      const { rows } = await db.query(
        'select h.name as household, m.display_name from households h join members m on m.household_id = h.id',
      );
      expect(rows).toEqual([{ household: 'Famiglia', display_name: 'Federico' }]);
    });
  });

  it('refuses when a household already exists: one family per installation', async () => {
    await as(USER.outsider, async (db) => {
      const error = await failure(db, create, ['Un altro nucleo', 'Estraneo']);
      expect(error.code).toBe('P0001');
      expect(error.message).toBe('household_already_exists');
    });
  });

  it('refuses a second household from the same user', async () => {
    await asOnEmptyInstance(USER.outsider, async (db) => {
      await db.query(create, ['Famiglia', 'Federico']);
      const error = await failure(db, create, ['Altra', 'Federico']);
      expect(error.message).toBe('household_already_exists');
    });
  });

  it.each([
    ['empty household name', '', 'Federico'],
    ['blank household name', '   ', 'Federico'],
    ['household name over 60 characters', 'x'.repeat(61), 'Federico'],
    ['empty member name', 'Famiglia', ''],
    ['member name over 40 characters', 'Famiglia', 'x'.repeat(41)],
  ])('rejects %s', async (_label, householdName, memberName) => {
    await asOnEmptyInstance(USER.outsider, async (db) => {
      const error = await failure(db, create, [householdName, memberName]);
      expect(error.code).toBe('22023');
      expect(error.message).toBe('invalid_name');
    });
  });

  it('is not callable by anonymous visitors', async () => {
    await asOnEmptyInstance('anon', async (db) => {
      const error = await failure(db, create, ['Famiglia', 'Federico']);
      expect(error.code).toBe('42501');
      expect(error.message).toMatch(/permission denied/);
    });
  });

  it('does not reopen direct inserts: ordinary writes to households and members stay denied (ADR-014)', async () => {
    await asOnEmptyInstance(USER.outsider, async (db) => {
      const error = await failure(db, `insert into households (name, owner_id) values ('x', $1)`, [
        USER.outsider,
      ]);
      expect(error.code).toBe('42501');
      expect(error.message).toMatch(/row-level security/);
    });
  });
});
