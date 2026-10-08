import type pg from 'pg';
import { describe, expect, it } from 'vitest';
import { as, affected, denied, failure, rows } from './helpers';
import { H1, H2, INVITE, USER } from './fixtures';

describe('invites: who can create one (admin-only)', () => {
  it('an admin creates an invite for their own household', async () => {
    const created = await rows(
      USER.owner,
      `insert into invites (household_id, role, created_by) values ($1, 'member', $2)
       returning household_id, role, used_at, used_by, length(code) as code_length,
                 expires_at between now() + interval '23 hours' and now() + interval '24 hours' as expires_in_24h`,
      [H1, USER.owner],
    );
    expect(created).toEqual([
      {
        household_id: H1,
        role: 'member',
        used_at: null,
        used_by: null,
        code_length: 64,
        expires_in_24h: true,
      },
    ]);
  });

  it('a secondary admin can also create one', async () => {
    const created = await rows(
      USER.admin2,
      `insert into invites (household_id, role, created_by) values ($1, 'admin', $2) returning id`,
      [H1, USER.admin2],
    );
    expect(created).toHaveLength(1);
  });

  it('an ordinary member cannot create one', async () => {
    await denied(
      USER.member,
      'rls',
      `insert into invites (household_id, role, created_by) values ($1, 'member', $2)`,
      [H1, USER.member],
    );
  });

  it('an admin cannot create an invite for another household', async () => {
    await denied(
      USER.owner,
      'rls',
      `insert into invites (household_id, role, created_by) values ($1, 'member', $2)`,
      [H2, USER.owner],
    );
  });

  it('an admin cannot impersonate another member as created_by', async () => {
    await denied(
      USER.owner,
      'rls',
      `insert into invites (household_id, role, created_by) values ($1, 'member', $2)`,
      [H1, USER.member],
    );
  });

  it('an admin cannot set a longer expiry than 24h', async () => {
    await denied(
      USER.owner,
      'rls',
      `insert into invites (household_id, role, created_by, expires_at) values ($1, 'member', $2, now() + interval '10 days')`,
      [H1, USER.owner],
    );
  });

  it('an admin cannot pre-mark an invite as used', async () => {
    await denied(
      USER.owner,
      'rls',
      `insert into invites (household_id, role, created_by, used_by) values ($1, 'member', $2, $2)`,
      [H1, USER.owner],
    );
  });
});

describe('invites: who can see or delete one (admin-only, not member)', () => {
  it('an admin sees the pending invite of their household', async () => {
    expect(await rows(USER.owner, 'select id from invites where id = $1', [INVITE.h1])).toEqual([
      { id: INVITE.h1 },
    ]);
  });

  it('an ordinary member does not see it, even though they are in the household', async () => {
    expect(await rows(USER.member, 'select id from invites where id = $1', [INVITE.h1])).toEqual(
      [],
    );
  });

  it('an admin can delete a stale invite from their household', async () => {
    expect(await affected(USER.owner, 'delete from invites where id = $1', [INVITE.h1])).toBe(1);
  });

  it('an admin of another household cannot delete it', async () => {
    expect(await affected(USER.owner2, 'delete from invites where id = $1', [INVITE.h1])).toBe(0);
  });
});

// accept_invite needs a seeded row that survives across a role switch, so
// these run as `service` and flip to `authenticated` mid-transaction (the
// same trick helpers.ts uses for asOnEmptyInstance).
describe('accept_invite', () => {
  const seedInvite = (
    db: pg.PoolClient,
    overrides: { role?: string; usedAt?: string; expiresAt?: string } = {},
  ) =>
    db.query(
      `insert into invites (household_id, role, created_by, used_at, expires_at)
       values ($1, $2, $3, $4, coalesce($5, now() + interval '24 hours'))
       returning code`,
      [
        H1,
        overrides.role ?? 'member',
        USER.owner,
        overrides.usedAt ?? null,
        overrides.expiresAt ?? null,
      ],
    );

  const switchTo = async (db: pg.PoolClient, userId: string) => {
    await db.query(`select set_config('request.jwt.claims', $1, true)`, [
      JSON.stringify({ sub: userId, role: 'authenticated' }),
    ]);
    await db.query('set local role authenticated');
  };

  it('a signed-in outsider joins with the role the invite grants', async () => {
    await as('service', async (db) => {
      const { rows: inviteRows } = await seedInvite(db, { role: 'admin' });
      const code = inviteRows[0].code;

      await switchTo(db, USER.outsider);
      const { rows: result } = await db.query('select accept_invite($1, $2) as household_id', [
        code,
        'Zia Anna',
      ]);
      expect(result[0].household_id).toBe(H1);

      await db.query('reset role');
      const member = await db.query(
        'select household_id, display_name, role from members where user_id = $1',
        [USER.outsider],
      );
      expect(member.rows).toEqual([{ household_id: H1, display_name: 'Zia Anna', role: 'admin' }]);

      const invite = await db.query('select used_by from invites where code = $1', [code]);
      expect(invite.rows[0].used_by).toBe(USER.outsider);
    });
  });

  it('trims the member name', async () => {
    await as('service', async (db) => {
      const { rows: inviteRows } = await seedInvite(db);
      await switchTo(db, USER.outsider);
      await db.query('select accept_invite($1, $2)', [inviteRows[0].code, '  Zio Bruno  ']);
      await db.query('reset role');
      const member = await db.query('select display_name from members where user_id = $1', [
        USER.outsider,
      ]);
      expect(member.rows[0].display_name).toBe('Zio Bruno');
    });
  });

  it('refuses an unknown code', async () => {
    await as('service', async (db) => {
      await switchTo(db, USER.outsider);
      const error = await failure(db, 'select accept_invite($1, $2)', ['not-a-real-code', 'X']);
      expect(error.message).toBe('invite_not_found');
    });
  });

  it('refuses an already-used code', async () => {
    await as('service', async (db) => {
      const { rows: inviteRows } = await seedInvite(db, { usedAt: new Date().toISOString() });
      await switchTo(db, USER.outsider);
      const error = await failure(db, 'select accept_invite($1, $2)', [inviteRows[0].code, 'X']);
      expect(error.message).toBe('invite_already_used');
    });
  });

  it('refuses an expired code', async () => {
    await as('service', async (db) => {
      const past = new Date(Date.now() - 1000).toISOString();
      const { rows: inviteRows } = await seedInvite(db, { expiresAt: past });
      await switchTo(db, USER.outsider);
      const error = await failure(db, 'select accept_invite($1, $2)', [inviteRows[0].code, 'X']);
      expect(error.message).toBe('invite_expired');
    });
  });

  it('refuses someone who already belongs to a household', async () => {
    await as('service', async (db) => {
      const { rows: inviteRows } = await seedInvite(db);
      await switchTo(db, USER.member);
      const error = await failure(db, 'select accept_invite($1, $2)', [inviteRows[0].code, 'X']);
      expect(error.message).toBe('already_member');
    });
  });

  it.each([
    ['empty member name', ''],
    ['blank member name', '   '],
    ['member name over 40 characters', 'x'.repeat(41)],
  ])('rejects %s', async (_label, memberName) => {
    await as('service', async (db) => {
      const { rows: inviteRows } = await seedInvite(db);
      await switchTo(db, USER.outsider);
      const error = await failure(db, 'select accept_invite($1, $2)', [
        inviteRows[0].code,
        memberName,
      ]);
      expect(error.code).toBe('22023');
      expect(error.message).toBe('invalid_name');
    });
  });

  it('is not callable by anonymous visitors', async () => {
    await as('service', async (db) => {
      const { rows: inviteRows } = await seedInvite(db);
      await db.query('set local role anon');
      const error = await failure(db, 'select accept_invite($1, $2)', [inviteRows[0].code, 'X']);
      expect(error.code).toBe('42501');
      expect(error.message).toMatch(/permission denied/);
    });
  });
});
