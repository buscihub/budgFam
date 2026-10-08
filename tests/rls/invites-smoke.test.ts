import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getEnv } from './env';

// Same rationale as api-smoke.test.ts: proves the real wiring (RPC parameter
// names, PostgREST insert, real signed-in sessions), not just the simulated
// SET ROLE used by invites.test.ts.

const env = getEnv();
const admin = createClient(env.apiUrl, env.serviceRoleKey, { auth: { persistSession: false } });
const PASSWORD = 'smoke-test-password-1';
const stamp = Date.now();
const email = (name: string) => `invite-smoke-${name}-${stamp}@example.test`;

const userIds: Record<'mother' | 'outsider', string> = { mother: '', outsider: '' };
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
    const household = await db.query(
      `insert into households (name, owner_id) values ('invite smoke', $1) returning id`,
      [userIds.mother],
    );
    householdId = household.rows[0].id;
    await db.query(
      `insert into members (household_id, user_id, display_name, role) values ($1, $2, 'mother', 'admin')`,
      [householdId, userIds.mother],
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

describe('invites through the API (Auth → PostgREST → Postgres)', () => {
  it('an admin creates an invite via a plain insert, and an outsider accepts it via RPC', async () => {
    const mother = await clientFor('mother');
    const created = await mother
      .from('invites')
      .insert({ household_id: householdId, role: 'member', created_by: userIds.mother })
      .select('code')
      .single();
    expect(created.error).toBeNull();
    const code = created.data!.code as string;

    const outsider = await clientFor('outsider');
    const accepted = await outsider.rpc('accept_invite', {
      invite_code: code,
      member_name: 'Zia Smoke',
    });
    expect(accepted.error).toBeNull();
    expect(accepted.data).toBe(householdId);

    // The new member now sees the household through ordinary RLS, exactly
    // like a real page load would.
    const { data: households } = await outsider.from('households').select('id');
    expect(households).toEqual([{ id: householdId }]);
  });
});
