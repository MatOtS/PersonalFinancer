-- Fixed expenses (work item 006): expenses that repeat, listed in the
-- dashboard. Money is integer cents (ADR-06). The rules live in
-- src/domain/fixed-expenses.ts; the checks here only enforce them.

create table fixed_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users on delete cascade,
  name text not null
    check (name = btrim(name) and char_length(name) between 1 and 50),
  amount_cents bigint not null
    constraint fixed_expenses_amount_range
    check (amount_cents between 0 and 99999999999),
  frequency text not null
    check (frequency in ('monthly', 'bimonthly', 'quarterly', 'annual')),
  account_id uuid,
  category_id uuid,
  active boolean not null default true,
  created_at timestamptz not null default now(),

  -- Keys that include the owner: a plain foreign key would accept another
  -- user's account (see the movements migration). Deleting the account or the
  -- category keeps the fixed expense without it.
  constraint fixed_expenses_account_fkey
    foreign key (account_id, user_id)
    references accounts (id, user_id) on delete set null (account_id),
  constraint fixed_expenses_category_fkey
    foreign key (category_id, user_id)
    references categories (id, user_id) on delete set null (category_id)
);

alter table fixed_expenses enable row level security;

create policy "owner all fixed_expenses" on fixed_expenses
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
