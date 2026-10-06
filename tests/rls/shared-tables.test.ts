import { describe, expect, it } from 'vitest';
import { affected, denied, ids } from './helpers';
import { ACCOUNT, CATEGORY, H1, IMPORT, RULE, TASK, USER } from './fixtures';

// Tables where every member reads, creates and edits, and deletion is
// reserved to admins (DESIGN_DOC §7). `tasks` deletes by creator or admin.

describe('categories', () => {
  it('members see their household categories', async () => {
    expect(await ids(USER.member, 'categories')).toEqual([CATEGORY.h1]);
  });
  it('members can add one and hide one (an update)', async () => {
    expect(
      await affected(
        USER.member,
        `insert into categories (household_id, name, kind) values ($1, 'Nuova', 'expense')`,
        [H1],
      ),
    ).toBe(1);
    expect(
      await affected(USER.member, 'update categories set is_hidden = true where id = $1', [
        CATEGORY.h1,
      ]),
    ).toBe(1);
  });
  it('members cannot delete, admins can', async () => {
    expect(await affected(USER.member, 'delete from categories where id = $1', [CATEGORY.h1])).toBe(
      0,
    );
    expect(await affected(USER.admin2, 'delete from categories where id = $1', [CATEGORY.h1])).toBe(
      1,
    );
  });
});

describe('category_rules', () => {
  it('members read, create and edit', async () => {
    expect(await ids(USER.member, 'category_rules')).toEqual([RULE.h1]);
    expect(
      await affected(
        USER.member,
        `insert into category_rules (household_id, pattern, category_id, created_by) values ($1, 'ESSELUNGA', $2, $3)`,
        [H1, CATEGORY.h1, USER.member],
      ),
    ).toBe(1);
    expect(
      await affected(USER.member, `update category_rules set pattern = 'x' where id = $1`, [
        RULE.h1,
      ]),
    ).toBe(1);
  });
  it('only admins delete', async () => {
    expect(await affected(USER.member, 'delete from category_rules where id = $1', [RULE.h1])).toBe(
      0,
    );
    expect(await affected(USER.admin2, 'delete from category_rules where id = $1', [RULE.h1])).toBe(
      1,
    );
  });
});

describe('imports', () => {
  it('members read and create import runs', async () => {
    expect(await ids(USER.member, 'imports')).toEqual([IMPORT.h1]);
    expect(
      await affected(
        USER.member,
        `insert into imports (household_id, account_id, uploaded_by, file_name) values ($1, $2, $3, 'x.csv')`,
        [H1, ACCOUNT.memberShared, USER.member],
      ),
    ).toBe(1);
  });
  it('members update a run (the server action acts as the member)', async () => {
    expect(
      await affected(USER.member, `update imports set status = 'done' where id = $1`, [IMPORT.h1]),
    ).toBe(1);
  });
  it('only admins delete log entries', async () => {
    expect(await affected(USER.member, 'delete from imports where id = $1', [IMPORT.h1])).toBe(0);
    expect(await affected(USER.admin2, 'delete from imports where id = $1', [IMPORT.h1])).toBe(1);
  });
});

describe('tasks', () => {
  it('members read, create and edit', async () => {
    expect(await ids(USER.member, 'tasks')).toEqual([TASK.byMember, TASK.byOwner].sort());
    expect(
      await affected(
        USER.member,
        `insert into tasks (household_id, title, created_by) values ($1, 'x', $2)`,
        [H1, USER.member],
      ),
    ).toBe(1);
    expect(
      await affected(USER.member, `update tasks set title = 'y' where id = $1`, [TASK.byOwner]),
    ).toBe(1);
  });
  it('the creator can delete their own task', async () => {
    expect(await affected(USER.member, 'delete from tasks where id = $1', [TASK.byMember])).toBe(1);
  });
  it("an ordinary member cannot delete somebody else's task, an admin can", async () => {
    expect(await affected(USER.member, 'delete from tasks where id = $1', [TASK.byOwner])).toBe(0);
    expect(await affected(USER.admin2, 'delete from tasks where id = $1', [TASK.byMember])).toBe(1);
  });
  it('nobody creates a task in another household', async () => {
    await denied(
      USER.member,
      'rls',
      `insert into tasks (household_id, title, created_by) values ($1, 'x', $2)`,
      ['10000000-0000-0000-0000-000000000002', USER.member],
    );
  });
});
