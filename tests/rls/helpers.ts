import pg from 'pg';
import { expect } from 'vitest';
import { getEnv } from './env';

type Params = unknown[];
export type Actor = string | 'service' | 'anon';

let pool: pg.Pool | undefined;
const getPool = () => (pool ??= new pg.Pool({ connectionString: getEnv().dbUrl, max: 4 }));

export async function closePool() {
  await pool?.end();
  pool = undefined;
}

// Runs `fn` as `actor` inside a transaction that is ALWAYS rolled back.
// - a user id: role `authenticated` with that user's JWT claims, so RLS and
//   column grants apply exactly as for a logged-in user;
// - 'anon': role `anon`, i.e. not logged in;
// - 'service': the postgres role, which bypasses RLS (fixtures, constraints).
export async function as<T>(actor: Actor, fn: (db: pg.PoolClient) => Promise<T>): Promise<T> {
  const db = await getPool().connect();
  try {
    await db.query('begin');
    if (actor === 'anon') {
      await db.query('set local role anon');
    } else if (actor !== 'service') {
      const claims = JSON.stringify({ sub: actor, role: 'authenticated' });
      await db.query(`select set_config('request.jwt.claims', $1, true)`, [claims]);
      await db.query('set local role authenticated');
    }
    return await fn(db);
  } finally {
    await db.query('rollback');
    db.release();
  }
}

// Rows the actor can see.
export async function rows(actor: Actor, sql: string, params: Params = []) {
  return as(actor, async (db) => (await db.query(sql, params)).rows);
}

// Ids of the rows the actor can see, sorted, for readable assertions.
export async function ids(actor: Actor, table: string, column = 'id') {
  const result = await rows(actor, `select ${column} as id from ${table} order by ${column}`);
  return result.map((r: { id: string }) => r.id);
}

// How many rows a write touched. An UPDATE/DELETE blocked by a USING clause
// doesn't fail: it silently touches 0 rows (the row is invisible to the actor).
export async function affected(actor: Actor, sql: string, params: Params = []) {
  return as(actor, async (db) => (await db.query(sql, params)).rowCount);
}

const DENIAL = {
  // INSERT/UPDATE blocked by a WITH CHECK clause
  rls: { code: '42501', message: /row-level security/ },
  // column or table privilege missing (ADR-019)
  privilege: { code: '42501', message: /permission denied/ },
  unique: { code: '23505', message: /duplicate key/ },
  check: { code: '23514', message: /check constraint/ },
} as const;

// A write that must FAIL, for the right reason: checking the SQLSTATE and the
// message stops a test passing because of an unrelated error (a typo, a bad
// fixture) instead of the rule under test.
export async function denied(
  actor: Actor,
  kind: keyof typeof DENIAL,
  sql: string,
  params: Params = [],
) {
  await deniedAfter(actor, kind, [], sql, params);
}

// Same, but first runs `before` statements that must succeed (e.g. to store a
// row, then try to store it again).
export async function deniedAfter(
  actor: Actor,
  kind: keyof typeof DENIAL,
  before: [sql: string, params?: Params][],
  sql: string,
  params: Params = [],
) {
  const expected = DENIAL[kind];
  const error = await as(actor, async (db) => {
    for (const [stmt, stmtParams] of before) await db.query(stmt, stmtParams);
    try {
      await db.query(sql, params);
      return undefined;
    } catch (e) {
      return e as pg.DatabaseError;
    }
  });
  expect(error, 'the statement should have been rejected').toBeDefined();
  expect(error?.code).toBe(expected.code);
  expect(error?.message).toMatch(expected.message);
}
