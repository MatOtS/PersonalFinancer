-- Fixed expenses, clients, invoices, import profiles and keywords (work items
-- 005 to 010): user B must not see, change or use anything of user A, and the
-- two atomic functions (issue_invoice, pay_invoice) do what they promise.
-- Everything is rolled back at the end.

begin;
select plan(27);

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
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'expense', 'Home', 'home');
insert into clients (id, user_id, name) values
  ('d0000000-0000-0000-0000-000000000001',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Acme');
insert into fixed_expenses (id, user_id, name, amount_cents, frequency,
                            account_id, category_id) values
  ('f0000000-0000-0000-0000-000000000001',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Rent', 80000, 'monthly',
   'a0000000-0000-0000-0000-000000000002',
   'c0000000-0000-0000-0000-000000000001');
insert into invoices (id, user_id, client_id, issue_date) values
  ('e0000000-0000-0000-0000-000000000001',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'd0000000-0000-0000-0000-000000000001', '2026-11-19');
insert into invoice_lines (user_id, invoice_id, description,
                           quantity_hundredths, unit_price_cents) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'e0000000-0000-0000-0000-000000000001', 'Work', 100, 10000);
insert into user_settings (user_id, issuer_name) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'A SL');
insert into bank_profiles (user_id, account_id, date_column,
                           description_column, amount_column) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'a0000000-0000-0000-0000-000000000001', 'Fecha', 'Concepto', 'Importe');
insert into category_keywords (user_id, keyword, keyword_key, category_id) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Mercadona', 'mercadona',
   'c0000000-0000-0000-0000-000000000001');

-- From here on, every query is made by B.
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}',
  true
);

select is_empty($$ select id from fixed_expenses $$, 'B does not see the fixed expenses of A');
select is_empty($$ select id from clients $$, 'B does not see the clients of A');
select is_empty($$ select user_id from user_settings $$, 'B does not see the settings of A');
select is_empty($$ select id from invoices $$, 'B does not see the invoices of A');
select is_empty($$ select id from invoice_lines $$, 'B does not see the lines of A');
select is_empty($$ select id from bank_profiles $$, 'B does not see the bank profiles of A');
select is_empty($$ select id from category_keywords $$, 'B does not see the keywords of A');
select is_empty(
  $$ with changed as (
       update clients set name = 'Hacked' returning id
     ) select id from changed $$,
  'B cannot change the clients of A'
);
select throws_ok(
  $$ insert into clients (user_id, name)
     values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'X') $$,
  '42501', null, 'B cannot create a client owned by A'
);

-- B cannot point at the data of A.
select throws_ok(
  $$ insert into fixed_expenses (name, amount_cents, frequency, account_id)
     values ('X', 1, 'monthly', 'a0000000-0000-0000-0000-000000000001') $$,
  '23503', null, 'B cannot use the account of A in a fixed expense'
);
select throws_ok(
  $$ insert into invoices (client_id, issue_date)
     values ('d0000000-0000-0000-0000-000000000001', '2026-11-19') $$,
  '23503', null, 'B cannot invoice a client of A'
);
select throws_ok(
  $$ insert into category_keywords (keyword, keyword_key, category_id)
     values ('x', 'x', 'c0000000-0000-0000-0000-000000000001') $$,
  '23503', null, 'B cannot tie a word to a category of A'
);
select throws_ok(
  $$ insert into bank_profiles (account_id, date_column, description_column,
                                amount_column)
     values ('a0000000-0000-0000-0000-000000000001', 'a', 'b', 'c') $$,
  '23503', null, 'B cannot remember columns for an account of A'
);
select throws_ok(
  $$ select issue_invoice('e0000000-0000-0000-0000-000000000001', 2026) $$,
  'P0002', 'The invoice is not a draft', 'B cannot issue an invoice of A'
);

-- B has no accounts: paying an issued invoice has nowhere to put the income.
insert into clients (id, name) values
  ('d0000000-0000-0000-0000-000000000002', 'Beta');
insert into invoices (id, client_id, issue_date) values
  ('e0000000-0000-0000-0000-000000000002',
   'd0000000-0000-0000-0000-000000000002', '2026-11-19');
select is(
  issue_invoice('e0000000-0000-0000-0000-000000000002', 2026),
  '2026-001', 'Issuing takes the first number with the default format'
);
select throws_ok(
  $$ select pay_invoice('e0000000-0000-0000-0000-000000000002', '2026-11-20', 5000) $$,
  'P0003', 'The user has no accounts', 'Paying with no accounts is refused'
);
select is(
  (select status from invoices where id = 'e0000000-0000-0000-0000-000000000002'),
  'issued', 'A refused payment leaves the invoice issued'
);

-- Now A: issuing and paying.
reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}',
  true
);
select is(
  issue_invoice('e0000000-0000-0000-0000-000000000001', 2026),
  '2026-001', 'A takes the number 2026-001 (numbers are per user)'
);
select is(
  (select invoice_number_next from user_settings
   where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  2, 'Issuing moves the counter forward'
);
select throws_ok(
  $$ select issue_invoice('e0000000-0000-0000-0000-000000000001', 2026) $$,
  'P0002', 'The invoice is not a draft', 'An issued invoice cannot be issued again'
);
select lives_ok(
  $$ select pay_invoice('e0000000-0000-0000-0000-000000000001', '2026-11-20', 12100) $$,
  'An issued invoice can be paid'
);
select is(
  (select count(*) from movements
   where invoice_id = 'e0000000-0000-0000-0000-000000000001'
     and kind = 'income' and amount_cents = 12100
     and work_kind = 'freelance' and source = 'invoice'
     and account_id = 'a0000000-0000-0000-0000-000000000001'
     and description = 'Cobro factura 2026-001'),
  1::bigint, 'Paying creates one freelance income in the first account'
);
select throws_ok(
  $$ select pay_invoice('e0000000-0000-0000-0000-000000000001', '2026-11-20', 12100) $$,
  'P0002', 'The invoice is not issued', 'Paying twice is refused'
);

-- The database refuses what the rules of the app already refuse.
reset role;
select throws_ok(
  $$ insert into invoices (user_id, client_id, issue_date, status)
     values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
             'd0000000-0000-0000-0000-000000000001', '2026-11-19', 'issued') $$,
  '23514', null, 'An issued invoice must have a number'
);
select throws_ok(
  $$ insert into fixed_expenses (user_id, name, amount_cents, frequency)
     values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'X', -1, 'monthly') $$,
  '23514', null, 'A fixed expense cannot have a negative amount'
);

-- What happens when something they use is deleted.
delete from accounts where id = 'a0000000-0000-0000-0000-000000000002';
select is(
  (select account_id is null and user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
   from fixed_expenses where id = 'f0000000-0000-0000-0000-000000000001'),
  true, 'Deleting the account keeps the fixed expense without it'
);
delete from categories where id = 'c0000000-0000-0000-0000-000000000001';
select is_empty(
  $$ select id from category_keywords
     where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
  'Deleting a category deletes its words'
);

select * from finish();
rollback;
