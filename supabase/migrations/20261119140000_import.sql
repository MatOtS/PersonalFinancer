-- Statement import (work item 005): the columns remembered per account and the
-- words that give a category. Rules live in src/domain/; checks only enforce.

create table bank_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users on delete cascade,
  account_id uuid not null,
  date_column text not null check (char_length(date_column) between 1 and 200),
  description_column text not null
    check (char_length(description_column) between 1 and 200),
  amount_column text not null
    check (char_length(amount_column) between 1 and 200),
  -- Null when the statement has no sign column.
  sign_column text check (sign_column is null
    or char_length(sign_column) between 1 and 200),
  -- One profile per account.
  unique (user_id, account_id),
  constraint bank_profiles_account_fkey
    foreign key (account_id, user_id)
    references accounts (id, user_id) on delete cascade
);

create table category_keywords (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users on delete cascade,
  keyword text not null
    check (keyword = btrim(keyword) and char_length(keyword) between 1 and 50),
  -- Comparison key computed by the app (nameKey): "Mercadona" and "mercadona" collide.
  keyword_key text not null check (keyword_key <> ''),
  category_id uuid not null,
  created_at timestamptz not null default now(),
  unique (user_id, keyword_key),
  constraint category_keywords_category_fkey
    foreign key (category_id, user_id)
    references categories (id, user_id) on delete cascade
);

alter table bank_profiles enable row level security;
alter table category_keywords enable row level security;

create policy "owner all bank_profiles" on bank_profiles
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owner all category_keywords" on category_keywords
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
