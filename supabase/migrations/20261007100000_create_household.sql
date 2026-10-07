-- Onboarding entry point (ADR-022, closes the gap of ADR-014): the only way to
-- create a household. `security definer` lets it insert the first admin, which
-- no RLS policy can allow (nobody is a member yet).

create function public.create_household(household_name text, member_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  hh  uuid;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  -- Same limits as the app's Zod schema; repeated here because the database is
  -- the boundary that can't be bypassed.
  household_name := btrim(household_name);
  member_name := btrim(member_name);
  if household_name is null or length(household_name) not between 1 and 60
     or member_name is null or length(member_name) not between 1 and 40 then
    raise exception 'invalid_name' using errcode = '22023';
  end if;

  -- Two simultaneous sign-ups must not both see "no household yet".
  perform pg_advisory_xact_lock(hashtext('create_household'));

  -- One family per installation (DESIGN_DOC §2). It is a product rule, not a
  -- data-model one, so it lives here rather than in a unique index.
  if exists (select 1 from households) then
    raise exception 'household_already_exists' using errcode = 'P0001';
  end if;

  insert into households (name, owner_id) values (household_name, uid) returning id into hh;
  insert into members (household_id, user_id, display_name, role) values (hh, uid, member_name, 'admin');

  -- Starting categories (DESIGN_DOC §6.1). Hidden or extended later per household.
  insert into categories (household_id, name, kind)
  select hh, name, kind from (values
    ('Casa', 'expense'), ('Utenze', 'expense'), ('Spesa alimentare', 'expense'),
    ('Ristoranti e bar', 'expense'), ('Trasporti', 'expense'), ('Auto', 'expense'),
    ('Salute', 'expense'), ('Svago', 'expense'), ('Abbonamenti', 'expense'),
    ('Abbigliamento', 'expense'), ('Viaggi', 'expense'), ('Istruzione', 'expense'),
    ('Regali', 'expense'), ('Rate e finanziamenti', 'expense'), ('Altro', 'expense'),
    ('Stipendio', 'income'), ('Altre entrate', 'income'), ('Investimenti', 'income'),
    ('Giroconto tra conti', 'transfer'), ('Paghetta', 'transfer'), ('Aiuto economico', 'transfer'),
    ('Rimborso spese', 'transfer'), ('Regalo in denaro', 'transfer'),
    ('B&B', 'excluded')
  ) as seed(name, kind);

  return hh;
end;
$$;

-- Supabase grants EXECUTE on new functions to anon and authenticated by
-- default: only signed-in users may call this one.
revoke all on function public.create_household(text, text) from public, anon, authenticated;
grant execute on function public.create_household(text, text) to authenticated;
