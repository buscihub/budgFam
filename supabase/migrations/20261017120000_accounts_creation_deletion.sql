-- Task 1.5a: creating and deleting accounts.
-- ADR-028: accounts.bank_format becomes the identifier of a preset in the code.
-- ADR-033: deleting an account deletes its private transactions and keeps the
--          shared ones, which are left without an account.
-- No policy changes: accounts_delete (ADR-015) already says who may delete.

-- ---------------------------------------------------------------------------
-- bank_format: jsonb -> text (ADR-028). There are no real accounts yet, so
-- nothing to convert: `using null` DISCARDS any existing value, so this is only
-- safe while no real account exists (ADR-028). The allowed identifiers are validated in src/domain, not
-- here: adding a bank must not need a migration.
-- ---------------------------------------------------------------------------

alter table accounts alter column bank_format type text using null;
comment on column accounts.bank_format is
  'Preset identifier (''revolut'', ''trade_republic'', ..., ''auto''); null until chosen. Validated in src/domain (ADR-028).';

-- Cash has no file to import, hence no format (ADR-025).
alter table accounts add constraint accounts_cash_has_no_format
  check (kind <> 'cash' or bank_format is null);

-- One name per owner, case-insensitive: stops "Revolut" being created twice.
create unique index accounts_owner_name_uq on accounts (owner_id, lower(name));

-- ---------------------------------------------------------------------------
-- account_id becomes nullable (null = account deleted, ADR-033). The FKs were
-- "no action", which made deleting any account with data impossible.
-- ---------------------------------------------------------------------------

alter table transactions alter column account_id drop not null;
alter table transactions drop constraint transactions_account_id_fkey;
alter table transactions add constraint transactions_account_id_fkey
  foreign key (account_id) references accounts on delete set null;

alter table imports alter column account_id drop not null;
alter table imports drop constraint imports_account_id_fkey;
alter table imports add constraint imports_account_id_fkey
  foreign key (account_id) references accounts on delete set null;

-- ---------------------------------------------------------------------------
-- Private transactions go with the account; the FK above keeps the shared ones.
-- Deliberately NOT security definer: the DELETE runs as the caller, so RLS
-- decides. The owner deletes their own private transactions; an admin deleting
-- somebody else's shared account cannot even see the owner's private ones, so
-- they are left orphaned (visible only to their owner), never destroyed by
-- someone who could not read them (ADR-015, ADR-033).
-- ---------------------------------------------------------------------------

create function public.delete_private_transactions_of_account() returns trigger
language plpgsql set search_path = public as $$
begin
  delete from transactions where account_id = old.id and visibility = 'private';
  return old;
end;
$$;

-- Only the trigger calls it; no role needs to execute it directly.
revoke all on function public.delete_private_transactions_of_account() from public, anon, authenticated;

create trigger accounts_delete_private_transactions
  before delete on accounts
  for each row execute function public.delete_private_transactions_of_account();
