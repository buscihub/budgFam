-- Review of tasks 1.5/1.5c: the same defence the other tables already have
-- (ADR-019), applied to `imports`, plus two gaps in change_account_visibility.
--
-- 1. imports had no column grants and `imports_update` was "any member": a
--    member could rewrite any column of anybody's import (account, uploader,
--    counters used for metrics) or mark it 'undone' without deleting its rows.
-- 2. imports_insert did not check who uploads or into which account: a member
--    could log an import for somebody else's private account, as somebody else.
--
-- Now only the uploader writes to an import, and only its status, error and
-- counters; an import is created by yourself, for one of your own accounts (or
-- none, as after an account is deleted: ADR-033).

revoke update on imports from authenticated;
grant update (status, error, rows_read, rows_inserted, rows_duplicate,
              by_rule, by_ai, needs_review, ai_tokens_in, ai_tokens_out)
  on imports to authenticated;

drop policy imports_insert on imports;
create policy imports_insert on imports for insert with check (
  is_member(household_id)
  and uploaded_by = auth.uid()
  and (account_id is null or owns_account(account_id, household_id))
);

drop policy imports_update on imports;
create policy imports_update on imports for update using (
  is_member(household_id) and uploaded_by = auth.uid()
) with check (
  is_member(household_id) and uploaded_by = auth.uid()
);

-- change_account_visibility: a NULL visibility or flag slipped through the
-- checks (NULL NOT IN (...) is NULL, not true), and the account row was not
-- locked, so two calls at once could interleave. CREATE OR REPLACE keeps the
-- grants of the original (20261019120000).
create or replace function public.change_account_visibility(
  p_account_id uuid,
  p_visibility text,
  p_apply_to_existing boolean,
  p_from_date date default null
)
returns integer
language plpgsql
set search_path = public
as $$
declare
  changed integer := 0;
begin
  if p_visibility is null or p_visibility not in ('private', 'shared')
     or p_apply_to_existing is null then
    raise exception 'invalid_visibility' using errcode = '22023';
  end if;

  perform 1 from accounts
   where id = p_account_id and owner_id = auth.uid()
   for update;
  if not found then
    raise exception 'account_not_found' using errcode = 'P0002';
  end if;

  if p_apply_to_existing then
    update transactions
       set visibility = p_visibility
     where account_id = p_account_id
       and owner_id = auth.uid()
       and visibility_overridden = false
       and visibility <> p_visibility
       and (p_from_date is null or booked_on >= p_from_date);
    get diagnostics changed = row_count;
  end if;

  update accounts
     set visibility = p_visibility
   where id = p_account_id and owner_id = auth.uid();

  return changed;
end;
$$;
