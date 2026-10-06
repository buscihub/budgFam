-- RLS for ADR-015 (personal/shared accounts), ADR-016 (primary admin) and
-- ADR-018 (personal budgets). Changes the policies of 0.5; tables and
-- operations not mentioned here keep theirs.

-- ---------------------------------------------------------------------------
-- Helpers. Same pattern as is_member/is_admin: `security definer` so a policy
-- can look at another table without re-entering that table's own policies.
-- ---------------------------------------------------------------------------

-- Is `uid` (default: the caller) the primary admin of the household?
create function public.is_owner(hh uuid, uid uuid default auth.uid()) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from households where id = hh and owner_id = uid);
$$;

-- Does the caller own this account, and does it belong to this household?
-- Used to stop a member from writing transactions into someone else's account.
create function public.owns_account(acc uuid, hh uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from accounts
                 where id = acc and household_id = hh and owner_id = auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- Immutable columns. A WITH CHECK only sees the new row, so it can't say "this
-- column must not change". Column-level grants can: owner_id/account_id/... are
-- simply not updatable by end users. Transferring ownership will be a
-- dedicated `security definer` function when it is needed, not a plain UPDATE.
-- ---------------------------------------------------------------------------

revoke update on households from authenticated;
grant update (name) on households to authenticated;

revoke update on accounts from authenticated;
grant update (name, kind, visibility, bank_format) on accounts to authenticated;

revoke update on members from authenticated;
grant update (display_name, role) on members to authenticated;

revoke update on transactions from authenticated;
grant update (booked_on, amount_cents, description, category_id, category_source,
              ai_confidence, needs_review, visibility, visibility_overridden,
              transfer_member_id)
  on transactions to authenticated;

revoke update on budgets from authenticated;
grant update (limit_cents) on budgets to authenticated;

-- ---------------------------------------------------------------------------
-- households: only the primary admin can delete the household (ADR-016).
-- Any admin can still rename it (the `update` policy is unchanged).
-- ---------------------------------------------------------------------------

drop policy households_delete on households;
create policy households_delete on households for delete using (
  is_owner(id)
);

-- ---------------------------------------------------------------------------
-- members (ADR-016). Admins manage ordinary members; only the primary admin
-- touches other admins; nobody can demote or remove the primary admin.
-- ---------------------------------------------------------------------------

drop policy members_insert on members;
drop policy members_update on members;
drop policy members_delete on members;

create policy members_insert on members for insert with check (
  is_admin(household_id) and (role = 'member' or is_owner(household_id))
);
-- USING looks at the old row (who may be touched), WITH CHECK at the new one
-- (what it may become): a secondary admin can't promote a member to admin, and
-- the primary admin's own row can't stop being an admin.
create policy members_update on members for update using (
  is_admin(household_id) and (role = 'member' or is_owner(household_id))
) with check (
  (role = 'member' or is_owner(household_id))
  and (role = 'admin' or not is_owner(household_id, user_id))
);
create policy members_delete on members for delete using (
  is_admin(household_id)
  and (role = 'member' or is_owner(household_id))
  and not is_owner(household_id, user_id)
);

-- ---------------------------------------------------------------------------
-- accounts (ADR-015). Everyone sees shared accounts and their own private
-- ones. Admins may manage other people's *shared* accounts but never see (or
-- hide) a private one: no admin exception to privacy, same as transactions.
-- ---------------------------------------------------------------------------

drop policy accounts_select on accounts;
drop policy accounts_insert on accounts;
drop policy accounts_update on accounts;
drop policy accounts_delete on accounts;

create policy accounts_select on accounts for select using (
  is_member(household_id) and (visibility = 'shared' or owner_id = auth.uid())
);
create policy accounts_insert on accounts for insert with check (
  is_member(household_id) and owner_id = auth.uid()
);
create policy accounts_update on accounts for update using (
  is_member(household_id)
  and (owner_id = auth.uid() or (is_admin(household_id) and visibility = 'shared'))
) with check (
  is_member(household_id) and (owner_id = auth.uid() or visibility = 'shared')
);
create policy accounts_delete on accounts for delete using (
  is_member(household_id)
  and (owner_id = auth.uid() or (is_admin(household_id) and visibility = 'shared'))
);

-- ---------------------------------------------------------------------------
-- transactions (ADR-015). The transaction's own `visibility` stays the single
-- source for reads, so the select policy is unchanged (an account's visibility
-- is only a default, and the override works in both directions). What changes
-- is writing: you can only insert into your own accounts, as yourself.
-- ---------------------------------------------------------------------------

drop policy transactions_insert on transactions;
create policy transactions_insert on transactions for insert with check (
  is_member(household_id)
  and owner_id = auth.uid()
  and owns_account(account_id, household_id)
);

-- ---------------------------------------------------------------------------
-- budgets (ADR-018). member_id null = household budget: members read, admins
-- write. member_id set = personal budget: only its owner, admins included.
-- ---------------------------------------------------------------------------

drop policy budgets_select on budgets;
drop policy budgets_insert on budgets;
drop policy budgets_update on budgets;
drop policy budgets_delete on budgets;

create policy budgets_select on budgets for select using (
  is_member(household_id) and (member_id is null or member_id = auth.uid())
);
create policy budgets_insert on budgets for insert with check (
  (member_id is null and is_admin(household_id))
  or (member_id = auth.uid() and is_member(household_id))
);
create policy budgets_update on budgets for update using (
  (member_id is null and is_admin(household_id))
  or (member_id = auth.uid() and is_member(household_id))
);
create policy budgets_delete on budgets for delete using (
  (member_id is null and is_admin(household_id))
  or (member_id = auth.uid() and is_member(household_id))
);
