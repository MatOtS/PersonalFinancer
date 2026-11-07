-- Accounts, categories and profiles (work item 003).
-- Every table has user_id and row level security: a user only sees and changes
-- their own rows. The rules about names live in src/domain/names.ts; the
-- checks here only enforce them, so a bug in the app cannot store a bad row.
-- Money is integer cents (ADR-06).

create table accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users on delete cascade,
  name text not null
    check (name = btrim(name) and char_length(name) between 1 and 50),
  -- Comparison key computed by the app (nameKey): "BBVA" and "bbva " collide.
  name_key text not null check (name_key <> ''),
  opening_balance_cents bigint not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, name_key)
);

-- A category has parent_id null; a subcategory points to its category.
create table categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users on delete cascade,
  kind text not null check (kind in ('expense', 'income')),
  parent_id uuid,
  name text not null
    check (name = btrim(name) and char_length(name) between 1 and 50),
  name_key text not null check (name_key <> ''),
  created_at timestamptz not null default now(),
  -- Target of the composite key below.
  unique (id, user_id, kind),
  -- A subcategory has the same owner and kind as its category, and goes with
  -- it when it is deleted. Not checked when parent_id is null.
  foreign key (parent_id, user_id, kind)
    references categories (id, user_id, kind) on delete cascade
);

-- Names are unique among the categories of one kind, and among the
-- subcategories of one category (the same name may repeat across categories).
create unique index categories_top_level_name
  on categories (user_id, kind, name_key) where parent_id is null;
create unique index categories_sub_name
  on categories (parent_id, name_key) where parent_id is not null;

-- Remembers that the default categories were already given (written last).
create table profiles (
  user_id uuid primary key default auth.uid()
    references auth.users on delete cascade,
  default_categories_added_at timestamptz
);

alter table accounts enable row level security;
alter table categories enable row level security;
alter table profiles enable row level security;

-- using filters the rows that exist; with check validates the rows written.
create policy "owner all accounts" on accounts
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owner all categories" on categories
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owner all profiles" on profiles
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
