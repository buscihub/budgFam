-- Schema changes for ADR-015 (personal/shared accounts), ADR-016 (primary
-- admin), ADR-017 (hidden categories, excluded kind) and ADR-018 (personal
-- budgets). Structure only: the matching RLS policies are in the next
-- migration so each can be reviewed on its own. No real data exists yet, so
-- the NOT NULL columns need no backfill.

-- ADR-016: the primary admin. The invariant "the owner is an admin member of
-- the household" depends on `members`, so a CHECK can't express it; it is
-- enforced by the onboarding function (task 0.7) and covered by RLS tests.
alter table households
  add column owner_id uuid not null references auth.users;

-- ADR-015: every account has an owner and a visibility that is only the
-- *default* for its transactions. Private by default: sharing is opt-in.
alter table accounts
  add column owner_id uuid not null references auth.users,
  add column visibility text not null default 'private'
    check (visibility in ('shared','private'));

-- ADR-017: hiding keeps history (transactions.category_id references the row,
-- so deleting a used category isn't an option); 'excluded' keeps e.g. the B&B
-- out of summaries and budgets.
alter table categories
  add column is_hidden boolean not null default false;
alter table categories drop constraint categories_kind_check;
alter table categories add constraint categories_kind_check
  check (kind in ('income','expense','transfer','excluded'));

-- ADR-015: private by default; the flag records a manual choice so that a
-- later change of the account's visibility never overwrites it.
-- transfer_member_id: recipient/sender of a family transfer. "Only meaningful
-- when the category kind is 'transfer'" depends on another table, so it is
-- enforced in src/data, not with a CHECK.
alter table transactions
  alter column visibility set default 'private',
  add column visibility_overridden boolean not null default false,
  add column transfer_member_id uuid references auth.users;

-- ADR-018: member_id null = household budget, set = personal budget. A
-- nullable column can't be part of a primary key, hence a surrogate id plus a
-- unique index that maps null to a fixed uuid.
alter table budgets drop constraint budgets_pkey;
alter table budgets
  add column id uuid primary key default gen_random_uuid(),
  add column member_id uuid references auth.users;
create unique index budgets_scope_uq on budgets
  (household_id, coalesce(member_id, '00000000-0000-0000-0000-000000000000'), category_id, month);
