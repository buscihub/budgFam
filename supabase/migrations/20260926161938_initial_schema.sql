-- Initial schema (DESIGN_DOC.md §6). Table/column names, types, unique and
-- check constraints are normative there; RLS is added in a later migration
-- (task 0.5) so this one can be reviewed and tested on its own.

create table households (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now()
);

create table members (
  household_id uuid not null references households on delete cascade,
  user_id      uuid not null references auth.users on delete cascade,
  display_name text not null,
  role         text not null check (role in ('admin','member')),
  created_at   timestamptz not null default now(),
  primary key (household_id, user_id)
);

create table accounts (          -- conto corrente, carta, contanti
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households on delete cascade,
  name         text not null,
  kind         text not null check (kind in ('bank','card','cash')),
  bank_format  jsonb,             -- mappatura colonne salvata (§8.1); null finché non rilevata
  created_at   timestamptz not null default now()
);

create table categories (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households on delete cascade,
  name         text not null,
  kind         text not null check (kind in ('income','expense','transfer')),
  unique (household_id, name)
);

create table imports (           -- un caricamento di file: serve a log, metriche e annullamento
  id             uuid primary key default gen_random_uuid(),
  household_id   uuid not null references households on delete cascade,
  account_id     uuid not null references accounts,
  uploaded_by    uuid not null references auth.users,
  file_name      text not null,
  rows_read      int not null default 0,
  rows_inserted  int not null default 0,
  rows_duplicate int not null default 0,
  by_rule        int not null default 0,
  by_ai          int not null default 0,
  needs_review   int not null default 0,
  ai_tokens_in   int not null default 0,
  ai_tokens_out  int not null default 0,
  status         text not null default 'processing'
                 check (status in ('processing','done','failed')),
  error          text,
  created_at     timestamptz not null default now()
);

create table transactions (
  id              uuid primary key default gen_random_uuid(),
  household_id    uuid not null references households on delete cascade,
  account_id      uuid not null references accounts,
  import_id       uuid references imports on delete set null,  -- null = inserito a mano
  owner_id        uuid references auth.users,
  booked_on       date not null,
  amount_cents    bigint not null,          -- negativo = uscita
  description     text not null,            -- normalizzata
  raw_description text not null,            -- originale, per debug e regole
  category_id     uuid references categories,
  category_source text check (category_source in ('rule','ai','user')),
  ai_confidence   numeric check (ai_confidence between 0 and 1),
  needs_review    boolean not null default false,
  visibility      text not null default 'shared'
                  check (visibility in ('shared','private')),
  import_hash     text,
  created_at      timestamptz not null default now(),
  unique (household_id, import_hash)        -- idempotenza degli import
);
create index on transactions (household_id, booked_on);

create table category_rules (      -- "CONAD" → Spesa, imparate dalle correzioni
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households on delete cascade,
  pattern      text not null,       -- sottostringa sulla descrizione normalizzata
  category_id  uuid not null references categories on delete cascade,
  created_by   uuid references auth.users,
  created_at   timestamptz not null default now(),
  unique (household_id, pattern)
);

create table budgets (
  household_id uuid not null references households on delete cascade,
  category_id  uuid not null references categories on delete cascade,
  month        date not null check (extract(day from month) = 1),  -- primo del mese
  limit_cents  bigint not null check (limit_cents >= 0),
  primary key (household_id, category_id, month)
);

create table tasks (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households on delete cascade,
  title        text not null,
  notes        text,
  assignee_id  uuid references auth.users,
  created_by   uuid not null references auth.users,
  due_on       date,
  done_at      timestamptz,
  recurrence   text check (recurrence in ('weekly','monthly')),  -- null = non ricorrente
  created_at   timestamptz not null default now()
);
