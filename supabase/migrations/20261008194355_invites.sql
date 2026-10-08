-- Invites (task 0.7c): the only way to join the household that
-- create_household (ADR-022) already created, since that function refuses a
-- second household. Unlike create_household, creating an invite needs no
-- security definer: the caller is already an admin, so an ordinary INSERT
-- policy is enough. Accepting one does: the caller isn't a member yet.

create table invites (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households on delete cascade,
  code         text not null unique default encode(gen_random_bytes(32), 'hex'),
  role         text not null check (role in ('admin','member')),
  created_by   uuid not null references auth.users,
  expires_at   timestamptz not null default (now() + interval '24 hours'),
  used_at      timestamptz,
  used_by      uuid references auth.users,
  created_at   timestamptz not null default now()
);
create index on invites (household_id);

alter table invites enable row level security;

-- Select is admin-only, not member-only: a pending code is effectively a
-- one-time password, not household information every member should see.
create policy invites_select on invites for select using (
  is_admin(household_id)
);

-- `expires_at <= now() + 24h` stops a modified client from minting a
-- longer-lived invite than the product decision (24h); used_at/used_by must
-- start empty regardless of what the client sends.
create policy invites_insert on invites for insert with check (
  is_admin(household_id)
  and created_by = auth.uid()
  and used_at is null
  and used_by is null
  and expires_at <= now() + interval '24 hours'
);

-- No UPDATE policy: nothing legitimate needs one. accept_invite (below) marks
-- an invite used as `security definer`, bypassing RLS like create_household.
create policy invites_delete on invites for delete using (
  is_admin(household_id)
);

create function public.accept_invite(invite_code text, member_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  inv record;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  -- Same limit as create_household's member_name: the database is the
  -- boundary that can't be bypassed.
  member_name := btrim(member_name);
  if member_name is null or length(member_name) not between 1 and 40 then
    raise exception 'invalid_name' using errcode = '22023';
  end if;

  if exists (select 1 from members where user_id = uid) then
    raise exception 'already_member' using errcode = 'P0001';
  end if;

  -- Row lock: two simultaneous accepts of the same code must not both
  -- succeed. `for update` on this one row is enough (unlike create_household,
  -- there is already a row to lock).
  select * into inv from invites where code = invite_code for update;
  if inv is null then
    raise exception 'invite_not_found' using errcode = 'P0002';
  end if;
  if inv.used_at is not null then
    raise exception 'invite_already_used' using errcode = 'P0003';
  end if;
  if inv.expires_at <= now() then
    raise exception 'invite_expired' using errcode = 'P0004';
  end if;

  insert into members (household_id, user_id, display_name, role)
  values (inv.household_id, uid, member_name, inv.role);

  update invites set used_at = now(), used_by = uid where id = inv.id;

  return inv.household_id;
end;
$$;

revoke all on function public.accept_invite(text, text) from public, anon, authenticated;
grant execute on function public.accept_invite(text, text) to authenticated;
