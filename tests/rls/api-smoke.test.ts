import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getEnv } from './env';

// End-to-end through the real stack: Auth issues a JWT, PostgREST puts it in
// the request, Postgres derives auth.uid() from it and applies RLS. The matrix
// tests simulate that last step with SET ROLE; these prove the whole chain.
// Rows here are committed (the API runs in its own connection), so they use
// their own household and users and are cleaned up afterwards.

const env = getEnv();
const admin = createClient(env.apiUrl, env.serviceRoleKey, { auth: { persistSession: false } });
const PASSWORD = 'smoke-test-password-1';
const stamp = Date.now();
const email = (name: string) => `smoke-${name}-${stamp}@example.test`;

const userIds: Record<'mother' | 'daughter' | 'stranger', string> = {
  mother: '',
  daughter: '',
  stranger: '',
};
let householdId = '';

async function clientFor(name: keyof typeof userIds) {
  const client = createClient(env.apiUrl, env.anonKey, { auth: { persistSession: false } });
  const { error } = await client.auth.signInWithPassword({
    email: email(name),
    password: PASSWORD,
  });
  expect(error).toBeNull();
  return client;
}

beforeAll(async () => {
  for (const name of Object.keys(userIds) as (keyof typeof userIds)[]) {
    const { data, error } = await admin.auth.admin.createUser({
      email: email(name),
      password: PASSWORD,
      email_confirm: true,
    });
    expect(error).toBeNull();
    userIds[name] = data.user!.id;
  }

  const db = new pg.Client({ connectionString: env.dbUrl });
  await db.connect();
  try {
    const { mother, daughter } = userIds;
    const household = await db.query(
      `insert into households (name, owner_id) values ('smoke', $1) returning id`,
      [mother],
    );
    householdId = household.rows[0].id;
    await db.query(
      `insert into members (household_id, user_id, display_name, role) values ($1, $2, 'mother', 'admin'), ($1, $3, 'daughter', 'member')`,
      [householdId, mother, daughter],
    );
    await db.query(
      `insert into accounts (household_id, name, kind, owner_id, visibility) values
         ($1, 'mother shared', 'bank', $2, 'shared'),
         ($1, 'mother private', 'card', $2, 'private'),
         ($1, 'daughter private', 'card', $3, 'private')`,
      [householdId, mother, daughter],
    );
  } finally {
    await db.end();
  }
});

afterAll(async () => {
  const db = new pg.Client({ connectionString: env.dbUrl });
  await db.connect();
  try {
    await db.query('delete from households where id = $1', [householdId]);
  } finally {
    await db.end();
  }
  for (const id of Object.values(userIds)) await admin.auth.admin.deleteUser(id);
});

const names = (rows: { name: string }[] | null) => (rows ?? []).map((r) => r.name).sort();

describe('RLS through the API (Auth → PostgREST → Postgres)', () => {
  it('a logged-in member sees shared accounts plus their own private ones only', async () => {
    const daughter = await clientFor('daughter');
    const { data, error } = await daughter.from('accounts').select('name');
    expect(error).toBeNull();
    expect(names(data)).toEqual(['daughter private', 'mother shared']);
  });

  it('a logged-in user with no household sees nothing', async () => {
    const stranger = await clientFor('stranger');
    const { data, error } = await stranger.from('accounts').select('name');
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('an anonymous client sees nothing', async () => {
    const anon = createClient(env.apiUrl, env.anonKey, { auth: { persistSession: false } });
    const { data } = await anon.from('accounts').select('name');
    expect(data ?? []).toEqual([]);
  });
});
