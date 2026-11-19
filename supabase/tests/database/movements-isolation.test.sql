-- Movements: ownership and access (work item 004).
-- User B must not see, change or use anything of user A through a movement,
-- and what happens to the movements when an account, a category or a
-- subcategory is deleted. As in isolation.test.sql, B's queries run after
-- switching to the `authenticated` role with B's identity; everything is rolled
-- back at the end.

begin;
select plan(20);

insert into auth.users (id) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

-- Data of A, created as superuser.
insert into accounts (id, user_id, name, name_key) values
  ('a0000000-0000-0000-0000-000000000001',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'BBVA', 'bbva'),
  ('a0000000-0000-0000-0000-000000000002',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Wise', 'wise');
insert into categories (id, user_id, kind, name, name_key) values
  ('c0000000-0000-0000-0000-000000000001',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'expense', 'Home', 'home'),
  ('c0000000-0000-0000-0000-000000000003',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'expense', 'Food', 'food'),
  ('c0000000-0000-0000-0000-000000000005',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'expense', 'Leisure', 'leisure');
insert into categories (id, user_id, kind, parent_id, name, name_key) values
  ('c0000000-0000-0000-0000-000000000002',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'expense',
   'c0000000-0000-0000-0000-000000000001', 'Rent', 'rent'),
  ('c0000000-0000-0000-0000-000000000004',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'expense',
   'c0000000-0000-0000-0000-000000000003', 'Groceries', 'groceries');
insert into movements (
  id, user_id, kind, amount_cents, date, account_id, category_id,
  subcategory_id, work_kind
) values
  -- Plain movement, used by the tests of B.
  ('d0000000-0000-0000-0000-000000000001',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'expense', 1250, '2026-11-18',
   'a0000000-0000-0000-0000-000000000001', null, null, 'personal'),
  -- Goes away with its account (Wise).
  ('d0000000-0000-0000-0000-000000000002',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'income', 5000, '2026-11-18',
   'a0000000-0000-0000-0000-000000000002', null, null, 'freelance'),
  -- Loses its category and its subcategory when the category is deleted.
  ('d0000000-0000-0000-0000-000000000003',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'expense', 700, '2026-11-18',
   'a0000000-0000-0000-0000-000000000001',
   'c0000000-0000-0000-0000-000000000001',
   'c0000000-0000-0000-0000-000000000002', 'personal'),
  -- Loses only its subcategory when the subcategory is deleted.
  ('d0000000-0000-0000-0000-000000000004',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'expense', 300, '2026-11-18',
   'a0000000-0000-0000-0000-000000000001',
   'c0000000-0000-0000-0000-000000000003',
   'c0000000-0000-0000-0000-000000000004', 'personal');

-- From here on, every query is made by B.
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}',
  true
);

-- One user cannot see or change another user's movements.
select is_empty(
  $$ select id from movements where id = 'd0000000-0000-0000-0000-000000000001' $$,
  'B does not see the movement of A'
);
select is_empty($$ select id from movements $$, 'B lists no movements of A');
select is_empty(
  $$ with changed as (
       update movements set amount_cents = 1
       where id = 'd0000000-0000-0000-0000-000000000001' returning id
     ) select id from changed $$,
  'B cannot change the movement of A'
);
select is_empty(
  $$ with removed as (
       delete from movements
       where id = 'd0000000-0000-0000-0000-000000000001' returning id
     ) select id from removed $$,
  'B cannot delete the movement of A'
);
select throws_ok(
  $$ insert into movements (
       user_id, kind, amount_cents, date, account_id, work_kind
     ) values (
       'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'expense', 1, '2026-11-18',
       'a0000000-0000-0000-0000-000000000001', 'personal'
     ) $$,
  '42501',
  'new row violates row-level security policy for table "movements"',
  'B cannot create a movement owned by A'
);

-- One user cannot use another user's account, category or subcategory. A plain
-- foreign key would accept them (it is checked without the policies of the
-- other table), so the keys include the owner.
select throws_ok(
  $$ insert into movements (kind, amount_cents, date, account_id, work_kind)
     values ('expense', 1, '2026-11-18',
             'a0000000-0000-0000-0000-000000000001', 'personal') $$,
  '23503',
  'insert or update on table "movements" violates foreign key constraint "movements_account_fkey"',
  'B cannot save a movement in the account of A'
);

insert into accounts (id, name, name_key)
  values ('b0000000-0000-0000-0000-000000000001', 'Caja', 'caja');
insert into categories (id, kind, name, name_key)
  values ('e0000000-0000-0000-0000-000000000001', 'expense', 'Mine', 'mine');

select throws_ok(
  $$ insert into movements (
       kind, amount_cents, date, account_id, category_id, work_kind
     ) values (
       'expense', 1, '2026-11-18', 'b0000000-0000-0000-0000-000000000001',
       'c0000000-0000-0000-0000-000000000001', 'personal'
     ) $$,
  '23503',
  'insert or update on table "movements" violates foreign key constraint "movements_category_fkey"',
  'B cannot use a category of A'
);
select throws_ok(
  $$ insert into movements (
       kind, amount_cents, date, account_id, category_id, subcategory_id,
       work_kind
     ) values (
       'expense', 1, '2026-11-18', 'b0000000-0000-0000-0000-000000000001',
       'e0000000-0000-0000-0000-000000000001',
       'c0000000-0000-0000-0000-000000000002', 'personal'
     ) $$,
  '23503',
  null,
  'B cannot use a subcategory of A'
);
select lives_ok(
  $$ insert into movements (
       id, kind, amount_cents, date, account_id, category_id, work_kind
     ) values (
       'f0000000-0000-0000-0000-000000000001', 'income', 100, '2026-11-18',
       'b0000000-0000-0000-0000-000000000001',
       'e0000000-0000-0000-0000-000000000001', 'freelance'
     ) $$,
  'B can save a movement with its own account and category'
);
select throws_ok(
  $$ update movements set user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
     where id = 'f0000000-0000-0000-0000-000000000001' $$,
  '42501',
  'new row violates row-level security policy for table "movements"',
  'B cannot hand over an own movement to A'
);

-- Back as superuser: nothing of A has changed.
reset role;
select is(
  (select amount_cents from movements
   where id = 'd0000000-0000-0000-0000-000000000001'),
  1250::bigint,
  'The movement of A is intact'
);

-- The database refuses what the rules of the app already refuse.
select throws_ok(
  $$ insert into movements (
       user_id, kind, amount_cents, date, account_id, category_id,
       subcategory_id, work_kind
     ) values (
       'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'expense', 1, '2026-11-18',
       'a0000000-0000-0000-0000-000000000001',
       'c0000000-0000-0000-0000-000000000005',
       'c0000000-0000-0000-0000-000000000002', 'personal'
     ) $$,
  '23503',
  'insert or update on table "movements" violates foreign key constraint "movements_subcategory_category_fkey"',
  'A subcategory must belong to the category of the movement'
);
select throws_ok(
  $$ insert into movements (
       user_id, kind, amount_cents, date, account_id, work_kind
     ) values (
       'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'expense', -1, '2026-11-18',
       'a0000000-0000-0000-0000-000000000001', 'personal'
     ) $$,
  '23514',
  'new row for relation "movements" violates check constraint "movements_amount_range"',
  'The amount cannot be negative'
);
select throws_ok(
  $$ insert into movements (
       user_id, kind, amount_cents, date, account_id, work_kind
     ) values (
       'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'expense', 100000000000,
       '2026-11-18', 'a0000000-0000-0000-0000-000000000001', 'personal'
     ) $$,
  '23514',
  'new row for relation "movements" violates check constraint "movements_amount_range"',
  'The amount cannot be above 999.999.999,99'
);
select throws_ok(
  $$ insert into movements (
       user_id, kind, amount_cents, date, account_id, work_kind
     ) values (
       'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'refund', 1, '2026-11-18',
       'a0000000-0000-0000-0000-000000000001', 'personal'
     ) $$,
  '23514',
  'new row for relation "movements" violates check constraint "movements_kind_check"',
  'The type is expense or income'
);
select throws_ok(
  $$ insert into movements (
       user_id, kind, amount_cents, date, account_id, work_kind, description
     ) values (
       'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'expense', 1, '2026-11-18',
       'a0000000-0000-0000-0000-000000000001', 'personal', repeat('a', 201)
     ) $$,
  '23514',
  'new row for relation "movements" violates check constraint "movements_description_clean"',
  'The description has at most 200 characters'
);

-- What happens to the movements when something they use is deleted.
delete from accounts where id = 'a0000000-0000-0000-0000-000000000002';
select is_empty(
  $$ select id from movements where id = 'd0000000-0000-0000-0000-000000000002' $$,
  'Deleting an account deletes its movements'
);

delete from categories where id = 'c0000000-0000-0000-0000-000000000001';
select is(
  (select category_id is null and subcategory_id is null from movements
   where id = 'd0000000-0000-0000-0000-000000000003'),
  true,
  'Deleting a category keeps the movement without category and subcategory'
);
select is(
  (select user_id from movements
   where id = 'd0000000-0000-0000-0000-000000000003'),
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'The movement keeps its owner when its category is deleted'
);

delete from categories where id = 'c0000000-0000-0000-0000-000000000004';
select is(
  (select category_id = 'c0000000-0000-0000-0000-000000000003'
          and subcategory_id is null from movements
   where id = 'd0000000-0000-0000-0000-000000000004'),
  true,
  'Deleting a subcategory keeps the movement and its category'
);

select * from finish();
rollback;
