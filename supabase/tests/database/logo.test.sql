-- The logo of the issuer (work item 009): the bucket is private and a user only
-- sees the files of their own folder.

begin;
select plan(5);

insert into auth.users (id) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

select is(
  (select public from storage.buckets where id = 'branding'),
  false, 'The bucket of the logos exists and is private'
);
select is(
  (select allowed_mime_types from storage.buckets where id = 'branding'),
  array['image/png', 'image/jpeg'], 'Only png and jpg are accepted'
);

insert into storage.objects (bucket_id, name, owner_id) values
  ('branding', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/logo.png',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}',
  true
);
select is_empty(
  $$ select name from storage.objects where bucket_id = 'branding' $$,
  'B does not see the logo of A'
);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('branding', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/other.png') $$,
  '42501', null, 'B cannot write in the folder of A'
);
select lives_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('branding', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/logo.png') $$,
  'B can write in its own folder'
);

select * from finish();
rollback;
