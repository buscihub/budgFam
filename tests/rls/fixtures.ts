import type pg from 'pg';

// Fixed ids so tests can name the rows they target. First digit = kind of row.
const id = (kind: number, n: number) =>
  `${kind}0000000-0000-0000-0000-${String(n).padStart(12, '0')}`;

// Two households. H1 = a family: a primary admin (the mother), a secondary
// admin and an ordinary member. H2 is another family; `outsider` has no
// household at all.
export const USER = {
  owner: id(0, 1), // primary admin of H1
  admin2: id(0, 2), // secondary admin of H1
  member: id(0, 3), // ordinary member of H1
  owner2: id(0, 4), // primary admin of H2
  outsider: id(0, 5), // belongs to no household
} as const;

export const H1 = id(1, 1);
export const H2 = id(1, 2);

export const ACCOUNT = {
  ownerShared: id(2, 1), // mother's account that pays for everyone
  memberPrivate: id(2, 2),
  memberShared: id(2, 3),
  admin2Private: id(2, 4),
  h2Shared: id(2, 5),
} as const;

export const TX = {
  ownerShared: id(4, 1), // shared, on ownerShared
  memberSharedOnPrivate: id(4, 2), // shared, on memberPrivate (ADR-015 override)
  memberPrivate: id(4, 3), // private, on memberPrivate
  ownerPrivate: id(4, 4), // private, on ownerShared
  h2Shared: id(4, 5),
} as const;

export const CATEGORY = { h1: id(3, 1), h2: id(3, 2) } as const;
export const BUDGET = {
  household: id(5, 1), // member_id null
  member: id(5, 2), // personal budget of `member`
  owner: id(5, 3), // personal budget of `owner`
  h2: id(5, 4),
} as const;
export const TASK = { byMember: id(6, 1), byOwner: id(6, 2), h2: id(6, 3) } as const;
export const IMPORT = { h1: id(7, 1), h2: id(7, 2) } as const;
export const RULE = { h1: id(8, 1), h2: id(8, 2) } as const;
export const INVITE = { h1: id(9, 1), h2: id(9, 2) } as const;

export const ALL_USERS = Object.values(USER);

// Every table with RLS, for the "outsiders see nothing" sweep.
export const TABLES = [
  'households',
  'members',
  'accounts',
  'categories',
  'imports',
  'transactions',
  'category_rules',
  'budgets',
  'tasks',
  'invites',
] as const;

export async function removeFixtures(db: pg.ClientBase): Promise<void> {
  // Households cascade to their rows; users can only go once no household
  // references them as owner_id.
  await db.query('delete from households where id = any($1)', [[H1, H2]]);
  await db.query('delete from auth.users where id = any($1)', [ALL_USERS]);
}

export async function seedFixtures(db: pg.ClientBase): Promise<void> {
  await removeFixtures(db); // leftovers of a crashed run

  for (const [i, u] of ALL_USERS.entries()) {
    await db.query(
      `insert into auth.users (id, email, aud, role) values ($1, $2, 'authenticated', 'authenticated')`,
      [u, `rls-test-${i}@example.test`],
    );
  }

  // Created with the postgres role: there is no policy letting a normal user
  // create the first household/member (ADR-014, onboarding is task 0.7).
  await db.query(
    `insert into households (id, name, owner_id) values ($1, 'H1', $2), ($3, 'H2', $4)`,
    [H1, USER.owner, H2, USER.owner2],
  );
  await db.query(
    `insert into members (household_id, user_id, display_name, role) values
       ($1, $2, 'owner', 'admin'), ($1, $3, 'admin2', 'admin'), ($1, $4, 'member', 'member'),
       ($5, $6, 'owner2', 'admin')`,
    [H1, USER.owner, USER.admin2, USER.member, H2, USER.owner2],
  );
  await db.query(
    `insert into accounts (id, household_id, name, kind, owner_id, visibility) values
       ($1, $6, 'owner shared', 'bank', $7, 'shared'),
       ($2, $6, 'member private', 'card', $8, 'private'),
       ($3, $6, 'member shared', 'cash', $8, 'shared'),
       ($4, $6, 'admin2 private', 'card', $9, 'private'),
       ($5, $10, 'h2 shared', 'bank', $11, 'shared')`,
    [
      ACCOUNT.ownerShared,
      ACCOUNT.memberPrivate,
      ACCOUNT.memberShared,
      ACCOUNT.admin2Private,
      ACCOUNT.h2Shared,
      H1,
      USER.owner,
      USER.member,
      USER.admin2,
      H2,
      USER.owner2,
    ],
  );
  await db.query(
    `insert into categories (id, household_id, name, kind) values ($1, $3, 'C1', 'expense'), ($2, $4, 'C2', 'expense')`,
    [CATEGORY.h1, CATEGORY.h2, H1, H2],
  );
  await db.query(
    `insert into transactions (id, household_id, account_id, owner_id, booked_on, amount_cents,
                               description, raw_description, visibility) values
       ($1, $6, $7, $11, '2026-10-01', -100, 't', 't', 'shared'),
       ($2, $6, $8, $12, '2026-10-01', -100, 't', 't', 'shared'),
       ($3, $6, $8, $12, '2026-10-01', -100, 't', 't', 'private'),
       ($4, $6, $7, $11, '2026-10-01', -100, 't', 't', 'private'),
       ($5, $9, $10, $13, '2026-10-01', -100, 't', 't', 'shared')`,
    [
      TX.ownerShared,
      TX.memberSharedOnPrivate,
      TX.memberPrivate,
      TX.ownerPrivate,
      TX.h2Shared,
      H1,
      ACCOUNT.ownerShared,
      ACCOUNT.memberPrivate,
      H2,
      ACCOUNT.h2Shared,
      USER.owner,
      USER.member,
      USER.owner2,
    ],
  );
  await db.query(
    `insert into budgets (id, household_id, member_id, category_id, month, limit_cents) values
       ($1, $5, null, $6, '2026-10-01', 1000),
       ($2, $5, $7, $6, '2026-10-01', 1000),
       ($3, $5, $8, $6, '2026-10-01', 1000),
       ($4, $9, null, $10, '2026-10-01', 1000)`,
    [
      BUDGET.household,
      BUDGET.member,
      BUDGET.owner,
      BUDGET.h2,
      H1,
      CATEGORY.h1,
      USER.member,
      USER.owner,
      H2,
      CATEGORY.h2,
    ],
  );
  await db.query(
    `insert into tasks (id, household_id, title, created_by) values
       ($1, $4, 'by member', $5), ($2, $4, 'by owner', $6), ($3, $7, 'h2', $8)`,
    [TASK.byMember, TASK.byOwner, TASK.h2, H1, USER.member, USER.owner, H2, USER.owner2],
  );
  await db.query(
    `insert into imports (id, household_id, account_id, uploaded_by, file_name) values
       ($1, $3, $4, $5, 'h1.csv'), ($2, $6, $7, $8, 'h2.csv')`,
    [IMPORT.h1, IMPORT.h2, H1, ACCOUNT.ownerShared, USER.owner, H2, ACCOUNT.h2Shared, USER.owner2],
  );
  await db.query(
    `insert into category_rules (id, household_id, pattern, category_id, created_by) values
       ($1, $3, 'CONAD', $4, $5), ($2, $6, 'COOP', $7, $8)`,
    [RULE.h1, RULE.h2, H1, CATEGORY.h1, USER.owner, H2, CATEGORY.h2, USER.owner2],
  );
  await db.query(
    `insert into invites (id, household_id, role, created_by) values
       ($1, $3, 'member', $5), ($2, $4, 'member', $6)`,
    [INVITE.h1, INVITE.h2, H1, H2, USER.owner, USER.owner2],
  );
}
