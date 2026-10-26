-- Fake development data only. Never real financial data (constitution 5).

-- Two fake users for the browser tests (tests/e2e/support/users.ts has their
-- emails and passwords). They exist only in the local database: `db:reset`
-- creates them. A second user is needed so a later spec can prove that one user
-- cannot see another user's data.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111111',
    'authenticated', 'authenticated', 'a@example.test',
    crypt('test-password-a', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now(),
    '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-2222-2222-222222222222',
    'authenticated', 'authenticated', 'b@example.test',
    crypt('test-password-b', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now(),
    '', '', '', ''
  );

insert into auth.identities (
  id, provider_id, user_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
) values
  (
    '11111111-1111-1111-1111-111111111111', 'a@example.test',
    '11111111-1111-1111-1111-111111111111',
    '{"sub":"11111111-1111-1111-1111-111111111111","email":"a@example.test","email_verified":true}',
    'email', now(), now(), now()
  ),
  (
    '22222222-2222-2222-2222-222222222222', 'b@example.test',
    '22222222-2222-2222-2222-222222222222',
    '{"sub":"22222222-2222-2222-2222-222222222222","email":"b@example.test","email_verified":true}',
    'email', now(), now(), now()
  );
