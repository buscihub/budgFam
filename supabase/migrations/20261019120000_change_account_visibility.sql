-- Task 1.5c (ADR-015, ADR-035): change who sees an account and, in the same
-- transaction, the movements the person chose to bring along.
--
-- Two statements from the app were not atomic: a failure between them left the
-- movements moved and the account unchanged. One function call is one
-- transaction, so it is all or nothing.
--
-- SECURITY INVOKER (the default) on purpose: it runs as the signed-in user, so
-- RLS and the column grants decide what it may touch, exactly as for the two
-- plain UPDATEs it replaces. No policy changes. The owner check below is not a
-- permission (RLS already has it): it gives the app a clear "not found".

create function public.change_account_visibility(
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
  if p_visibility not in ('private', 'shared') then
    raise exception 'invalid_visibility' using errcode = '22023';
  end if;

  if not exists (
    select 1 from accounts where id = p_account_id and owner_id = auth.uid()
  ) then
    raise exception 'account_not_found' using errcode = 'P0002';
  end if;

  -- Movements first, then the account. "Solo da ora" (p_apply_to_existing =
  -- false) touches no movement. Movements whose visibility was chosen by hand
  -- are never moved (ADR-015).
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

revoke all on function public.change_account_visibility(uuid, text, boolean, date)
  from public, anon;
grant execute on function public.change_account_visibility(uuid, text, boolean, date)
  to authenticated;
