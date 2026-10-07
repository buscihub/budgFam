import { describe, expect, it } from 'vitest';
import { affected, denied, ids } from './helpers';
import { BUDGET, CATEGORY, H1, USER } from './fixtures';

const sorted = (...a: string[]) => [...a].sort();
const insert = `insert into budgets (household_id, member_id, category_id, month, limit_cents) values ($1, $2, $3, $4, 500)`;

describe('budgets: reading (ADR-018)', () => {
  it('members see the household budget and their own personal one', async () => {
    expect(await ids(USER.member, 'budgets')).toEqual(sorted(BUDGET.household, BUDGET.member));
  });
  it("admins don't see other people's personal budgets", async () => {
    expect(await ids(USER.admin2, 'budgets')).toEqual([BUDGET.household]);
    expect(await ids(USER.owner, 'budgets')).toEqual(sorted(BUDGET.household, BUDGET.owner));
  });
});

describe('budgets: household budgets', () => {
  it('admins can create, edit and delete them', async () => {
    expect(await affected(USER.admin2, insert, [H1, null, CATEGORY.h1, '2026-11-01'])).toBe(1);
    expect(
      await affected(USER.admin2, 'update budgets set limit_cents = 1 where id = $1', [
        BUDGET.household,
      ]),
    ).toBe(1);
    expect(
      await affected(USER.admin2, 'delete from budgets where id = $1', [BUDGET.household]),
    ).toBe(1);
  });
  it('ordinary members can only read them', async () => {
    await denied(USER.member, 'rls', insert, [H1, null, CATEGORY.h1, '2026-11-01']);
    expect(
      await affected(USER.member, 'update budgets set limit_cents = 1 where id = $1', [
        BUDGET.household,
      ]),
    ).toBe(0);
    expect(
      await affected(USER.member, 'delete from budgets where id = $1', [BUDGET.household]),
    ).toBe(0);
  });
});

describe('budgets: personal budgets', () => {
  it('their owner can create, edit and delete them', async () => {
    expect(await affected(USER.member, insert, [H1, USER.member, CATEGORY.h1, '2026-11-01'])).toBe(
      1,
    );
    expect(
      await affected(USER.member, 'update budgets set limit_cents = 1 where id = $1', [
        BUDGET.member,
      ]),
    ).toBe(1);
    expect(await affected(USER.member, 'delete from budgets where id = $1', [BUDGET.member])).toBe(
      1,
    );
  });
  it('nobody creates one on behalf of somebody else', async () => {
    await denied(USER.member, 'rls', insert, [H1, USER.owner, CATEGORY.h1, '2026-11-01']);
    await denied(USER.owner, 'rls', insert, [H1, USER.member, CATEGORY.h1, '2026-11-01']);
  });
  it("admins cannot edit or delete other people's", async () => {
    expect(
      await affected(USER.admin2, 'update budgets set limit_cents = 1 where id = $1', [
        BUDGET.member,
      ]),
    ).toBe(0);
    expect(await affected(USER.owner, 'delete from budgets where id = $1', [BUDGET.member])).toBe(
      0,
    );
  });
  it('member_id is immutable (ADR-019)', async () => {
    await denied(USER.member, 'privilege', 'update budgets set member_id = null where id = $1', [
      BUDGET.member,
    ]);
  });
});

describe('budgets: one per scope, category and month', () => {
  it('a second household budget for the same category and month is rejected', async () => {
    await denied(USER.owner, 'unique', insert, [H1, null, CATEGORY.h1, '2026-10-01']);
  });
  it('a personal budget can coexist with the household one', async () => {
    expect(await affected(USER.owner, insert, [H1, USER.owner, CATEGORY.h1, '2026-11-01'])).toBe(1);
  });
});
