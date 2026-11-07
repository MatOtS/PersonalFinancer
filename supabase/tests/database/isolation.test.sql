-- Ownership and access (work item 003).
-- User B must not see, change or learn anything about the data of user A.
-- `supabase test db` runs as the superuser, which skips row level security, so
-- the queries of B run after switching to the `authenticated` role with B's
-- identity. Everything is rolled back at the end.

begin;
select plan(17);

-- Two users and some data for A, created as superuser.
insert into auth.users (id) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

insert into accounts (id, user_id, name, name_key) values
  ('a0000000-0000-0000-0000-000000000001',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'BBVA', 'bbva');
insert into categories (id, user_id, kind, name, name_key) values
  ('c0000000-0000-0000-0000-000000000001',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'expense', 'Home', 'home');
insert into profiles (user_id, default_categories_added_at) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', now());

-- From here on, every query is made by B.
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}',
  true
);

-- One user cannot see another user's data. `using` filters: no error, no rows.
select is_empty(
  $$ select id from accounts where id = 'a0000000-0000-0000-0000-000000000001' $$,
  'B does not see the account of A'
);
select is_empty(
  $$ select id from accounts where id = 'a0000000-0000-0000-0000-00000000ffff' $$,
  'B gets the same empty result for an id that does not exist'
);
select is_empty($$ select id from accounts $$, 'B lists no accounts of A');
select is_empty($$ select id from categories $$, 'B lists no categories of A');
select is_empty($$ select user_id from profiles $$, 'B does not see the profile of A');

-- One user cannot change another user's data. update and delete find no row.
select is_empty(
  $$ with changed as (
       update accounts set name = 'Hacked'
       where id = 'a0000000-0000-0000-0000-000000000001' returning id
     ) select id from changed $$,
  'B cannot rename the account of A'
);
select is_empty(
  $$ with removed as (
       delete from accounts
       where id = 'a0000000-0000-0000-0000-000000000001' returning id
     ) select id from removed $$,
  'B cannot delete the account of A'
);
select is_empty(
  $$ with changed as (
       update categories set name = 'Hacked'
       where id = 'c0000000-0000-0000-0000-000000000001' returning id
     ) select id from changed $$,
  'B cannot rename the category of A'
);
select is_empty(
  $$ with removed as (
       delete from categories
       where id = 'c0000000-0000-0000-0000-000000000001' returning id
     ) select id from removed $$,
  'B cannot delete the category of A'
);

-- insert and update are validated by `with check`: they raise an error.
select throws_ok(
  $$ insert into accounts (user_id, name, name_key)
     values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Trap', 'trap') $$,
  '42501',
  'new row violates row-level security policy for table "accounts"',
  'B cannot create an account owned by A'
);
select throws_ok(
  $$ insert into categories (user_id, kind, name, name_key)
     values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'expense', 'Trap', 'trap') $$,
  '42501',
  'new row violates row-level security policy for table "categories"',
  'B cannot create a category owned by A'
);

-- The same name as A's account is allowed: a duplicate error would reveal it.
select lives_ok(
  $$ insert into accounts (id, name, name_key)
     values ('b0000000-0000-0000-0000-000000000001', 'BBVA', 'bbva') $$,
  'B can create an account with the same name as the one of A'
);
select throws_ok(
  $$ update accounts set user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
     where id = 'b0000000-0000-0000-0000-000000000001' $$,
  '42501',
  'new row violates row-level security policy for table "accounts"',
  'B cannot hand over an own account to A'
);

-- A subcategory under a category of A fails like one under an unknown id.
select throws_ok(
  $$ insert into categories (kind, parent_id, name, name_key)
     values ('expense', 'c0000000-0000-0000-0000-000000000001', 'Rent', 'rent') $$,
  '23503',
  'insert or update on table "categories" violates foreign key constraint "categories_parent_id_user_id_kind_fkey"',
  'B cannot add a subcategory to a category of A'
);
select throws_ok(
  $$ insert into categories (kind, parent_id, name, name_key)
     values ('expense', 'c0000000-0000-0000-0000-00000000ffff', 'Rent', 'rent') $$,
  '23503',
  'insert or update on table "categories" violates foreign key constraint "categories_parent_id_user_id_kind_fkey"',
  'B gets the same error for a category that does not exist'
);

-- Back as superuser: nothing of A has changed.
reset role;
select is(
  (select name from accounts where id = 'a0000000-0000-0000-0000-000000000001'),
  'BBVA',
  'The account of A is intact'
);
select is(
  (select name from categories where id = 'c0000000-0000-0000-0000-000000000001'),
  'Home',
  'The category of A is intact'
);

select * from finish();
rollback;
