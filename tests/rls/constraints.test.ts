import { describe, it } from 'vitest';
import { as, denied, deniedAfter } from './helpers';
import { ACCOUNT, CATEGORY, H1, USER } from './fixtures';

// Database constraints (not RLS): run as the postgres role so a failure can
// only come from the constraint under test.

const insertTx = (hash: string | null) => ({
  sql: `insert into transactions (household_id, account_id, owner_id, booked_on, amount_cents, description, raw_description, import_hash)
        values ($1, $2, $3, '2026-10-02', -5, 'x', 'x', $4)`,
  params: [H1, ACCOUNT.memberPrivate, USER.member, hash],
});

describe('import idempotency (DESIGN_DOC §8.3)', () => {
  it('the same import_hash cannot be stored twice in a household', async () => {
    const { sql, params } = insertTx('hash-1');
    await deniedAfter('service', 'unique', [[sql, params]], sql, params);
  });
  it('transactions without a hash (manual entries) never collide', async () => {
    const { sql, params } = insertTx(null);
    await as('service', async (db) => {
      await db.query(sql, params);
      await db.query(sql, params);
    });
  });
});

describe('categories.kind', () => {
  const insert = (kind: string) =>
    `insert into categories (household_id, name, kind) values ($1, 'x', '${kind}')`;
  it("accepts 'excluded' (ADR-017)", async () => {
    await as('service', (db) => db.query(insert('excluded'), [H1]));
  });
  it('rejects unknown kinds', async () => {
    await denied('service', 'check', insert('bogus'), [H1]);
  });
});

describe('money and dates', () => {
  it('a budget limit cannot be negative', async () => {
    await denied(
      'service',
      'check',
      `insert into budgets (household_id, category_id, month, limit_cents) values ($1, $2, '2026-11-01', -1)`,
      [H1, CATEGORY.h1],
    );
  });
  it('a budget month must be the first of the month', async () => {
    await denied(
      'service',
      'check',
      `insert into budgets (household_id, category_id, month, limit_cents) values ($1, $2, '2026-11-15', 1)`,
      [H1, CATEGORY.h1],
    );
  });
});
