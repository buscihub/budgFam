import { describe, expect, it } from 'vitest';
import { affected, denied, rows } from './helpers';
import { ACCOUNT, H1, TABLES, USER } from './fixtures';

// DESIGN_DOC §7 and the Phase 0 exit criterion: whoever is not a member sees
// nothing, on any table, and can write nothing into a household.

const scopeColumn = (table: string) => (table === 'households' ? 'id' : 'household_id');

describe('a member of another household', () => {
  it.each(TABLES)('sees nothing of household 1 in %s', async (table) => {
    const found = await rows(
      USER.owner2,
      `select 1 from ${table} where ${scopeColumn(table)} = $1`,
      [H1],
    );
    expect(found).toHaveLength(0);
  });
});

describe.each([
  ['a user with no household', USER.outsider],
  ['an anonymous visitor', 'anon'],
])('%s', (_label, actor) => {
  it.each(TABLES)('sees no rows at all in %s', async (table) => {
    expect(await rows(actor, `select * from ${table}`)).toHaveLength(0);
  });
});

describe('writing into a household one does not belong to', () => {
  it('is rejected for inserts', async () => {
    await denied(
      USER.owner2,
      'rls',
      `insert into categories (household_id, name, kind) values ($1, 'x', 'expense')`,
      [H1],
    );
    await denied(
      USER.owner2,
      'rls',
      `insert into members (household_id, user_id, display_name, role) values ($1, $2, 'x', 'member')`,
      [H1, USER.outsider],
    );
  });
  it('does nothing for updates and deletes', async () => {
    expect(
      await affected(USER.owner2, `update households set name = 'x' where id = $1`, [H1]),
    ).toBe(0);
    expect(
      await affected(USER.owner2, 'delete from accounts where id = $1', [ACCOUNT.ownerShared]),
    ).toBe(0);
  });
});

describe('anonymous visitors', () => {
  it('cannot write at all', async () => {
    await denied(
      'anon',
      'rls',
      `insert into categories (household_id, name, kind) values ($1, 'x', 'expense')`,
      [H1],
    );
  });
});
