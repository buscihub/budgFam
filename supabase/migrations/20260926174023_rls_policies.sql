-- Row Level Security (DESIGN_DOC.md §7). is_member/is_admin are
-- `security definer` so policies on `members` don't query `members`
-- recursively (documented trap in §7).

create function public.is_member(hh uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from members where household_id = hh and user_id = auth.uid());
$$;

create function public.is_admin(hh uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from members
                 where household_id = hh and user_id = auth.uid() and role = 'admin');
$$;

-- households: no insert policy here on purpose. A household is created
-- together with its first admin member, which needs to bypass RLS (there is
-- no membership row yet to satisfy is_member/is_admin) — that onboarding
-- function is task 0.7. Until then, households can only be created with the
-- service role (e.g. from a Supabase Studio/SQL session), not by end users.
alter table households enable row level security;

create policy households_select on households for select using (
  is_member(id)
);
create policy households_update on households for update using (
  is_admin(id)
);
create policy households_delete on households for delete using (
  is_admin(id)
);

-- members: same bootstrapping gap as households — the first member of a new
-- household is inserted by the (not yet built) onboarding function, not by
-- this insert policy, since nobody is an admin of a household with no
-- members yet.
alter table members enable row level security;

create policy members_select on members for select using (
  is_member(household_id)
);
create policy members_insert on members for insert with check (
  is_admin(household_id)
);
create policy members_update on members for update using (
  is_admin(household_id)
);
create policy members_delete on members for delete using (
  is_admin(household_id)
);

-- accounts, categories, budgets, category_rules: members can read/create/
-- edit, only an admin can delete.
alter table accounts enable row level security;

create policy accounts_select on accounts for select using (
  is_member(household_id)
);
create policy accounts_insert on accounts for insert with check (
  is_member(household_id)
);
create policy accounts_update on accounts for update using (
  is_member(household_id)
);
create policy accounts_delete on accounts for delete using (
  is_admin(household_id)
);

alter table categories enable row level security;

create policy categories_select on categories for select using (
  is_member(household_id)
);
create policy categories_insert on categories for insert with check (
  is_member(household_id)
);
create policy categories_update on categories for update using (
  is_member(household_id)
);
create policy categories_delete on categories for delete using (
  is_admin(household_id)
);

alter table budgets enable row level security;

create policy budgets_select on budgets for select using (
  is_member(household_id)
);
create policy budgets_insert on budgets for insert with check (
  is_member(household_id)
);
create policy budgets_update on budgets for update using (
  is_member(household_id)
);
create policy budgets_delete on budgets for delete using (
  is_admin(household_id)
);

alter table category_rules enable row level security;

create policy category_rules_select on category_rules for select using (
  is_member(household_id)
);
create policy category_rules_insert on category_rules for insert with check (
  is_member(household_id)
);
create policy category_rules_update on category_rules for update using (
  is_member(household_id)
);
create policy category_rules_delete on category_rules for delete using (
  is_admin(household_id)
);

-- imports: members create and update their own household's import runs
-- (the upload/parse Server Action acts as the signed-in member, not with
-- the service role), only an admin can delete a log entry.
alter table imports enable row level security;

create policy imports_select on imports for select using (
  is_member(household_id)
);
create policy imports_insert on imports for insert with check (
  is_member(household_id)
);
create policy imports_update on imports for update using (
  is_member(household_id)
);
create policy imports_delete on imports for delete using (
  is_admin(household_id)
);

-- transactions: shared transactions are visible/editable by every member;
-- private ones only by their owner. The insert/update `with check` uses the
-- *new* row, so a member can't create or turn a transaction private under
-- someone else's owner_id (it would fail their own owner_id = auth.uid()
-- check) — this is the same pattern as the §7 example, applied to insert
-- and delete too.
alter table transactions enable row level security;

create policy transactions_select on transactions for select using (
  is_member(household_id) and (visibility = 'shared' or owner_id = auth.uid())
);
create policy transactions_insert on transactions for insert with check (
  is_member(household_id) and (visibility = 'shared' or owner_id = auth.uid())
);
create policy transactions_update on transactions for update using (
  is_member(household_id) and (visibility = 'shared' or owner_id = auth.uid())
) with check (
  is_member(household_id) and (visibility = 'shared' or owner_id = auth.uid())
);
create policy transactions_delete on transactions for delete using (
  is_member(household_id) and (owner_id = auth.uid() or is_admin(household_id))
);

-- tasks: members read/create/edit, only the creator or an admin deletes.
alter table tasks enable row level security;

create policy tasks_select on tasks for select using (
  is_member(household_id)
);
create policy tasks_insert on tasks for insert with check (
  is_member(household_id)
);
create policy tasks_update on tasks for update using (
  is_member(household_id)
);
create policy tasks_delete on tasks for delete using (
  created_by = auth.uid() or is_admin(household_id)
);
