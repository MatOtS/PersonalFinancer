-- Movements (work item 004): every expense or income the user registers.
-- Money is integer cents (ADR-06) and the amount is always positive: the type
-- says whether it adds or subtracts, and whoever calculates applies the sign.
-- The rules about the data live in src/domain/movements.ts; the checks here
-- only enforce them, so a bug in the app cannot store a bad row.

-- Keys that include the owner, so a movement can point at an account or a
-- category only when it belongs to the same user. A plain foreign key is
-- checked without the policies of the other table and would accept the id of
-- another user's account.
alter table accounts
  add constraint accounts_id_user_id_key unique (id, user_id);
alter table categories
  add constraint categories_id_user_id_key unique (id, user_id);
alter table categories
  add constraint categories_id_user_id_parent_id_key
  unique (id, user_id, parent_id);

create table movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users on delete cascade,
  kind text not null check (kind in ('expense', 'income')),
  amount_cents bigint not null,
  date date not null,
  -- Null when the user wrote none; never only spaces.
  description text,
  account_id uuid not null,
  category_id uuid,
  subcategory_id uuid,
  work_kind text not null check (work_kind in ('personal', 'freelance')),
  is_fixed boolean not null default false,
  created_at timestamptz not null default now(),

  -- Up to 999.999.999,99 and never negative.
  constraint movements_amount_range
    check (amount_cents between 0 and 99999999999),
  constraint movements_description_clean
    check (
      description is null
      or (description = btrim(description)
          and char_length(description) between 1 and 200)
    ),
  -- There is no check that a subcategory comes with its category: deleting a
  -- category clears both columns in two separate steps, and a check would fail
  -- in the first one. The form and src/domain/movements.ts require the category.

  -- The movements of an account go with it.
  constraint movements_account_fkey
    foreign key (account_id, user_id)
    references accounts (id, user_id) on delete cascade,
  -- Deleting a category (or a subcategory) keeps the movement and clears only
  -- that column: without the list, `user_id` would be cleared too.
  constraint movements_category_fkey
    foreign key (category_id, user_id)
    references categories (id, user_id) on delete set null (category_id),
  -- A subcategory used by a movement belongs to the same user.
  constraint movements_subcategory_fkey
    foreign key (subcategory_id, user_id)
    references categories (id, user_id) on delete set null (subcategory_id),
  -- And it is a subcategory of the category of the movement. Its action
  -- alone is not enough to clear the subcategory: when a category is deleted,
  -- `movements_category_fkey` may clear `category_id` first, and then this key
  -- no longer finds the row. The key above clears the subcategory in any order.
  constraint movements_subcategory_category_fkey
    foreign key (subcategory_id, user_id, category_id)
    references categories (id, user_id, parent_id)
    on delete set null (subcategory_id)
);

alter table movements enable row level security;

-- using filters the rows that exist; with check validates the rows written.
create policy "owner all movements" on movements
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
