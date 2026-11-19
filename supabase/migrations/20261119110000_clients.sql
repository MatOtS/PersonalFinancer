-- Clients (work item 007): the people and companies the user invoices.
-- The rules live in src/domain/clients.ts; the checks here only enforce them.

create table clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users on delete cascade,
  name text not null
    check (name = btrim(name) and char_length(name) between 1 and 100),
  -- Optional fiscal data: null when empty, never only spaces.
  tax_id text check (tax_id is null
    or (tax_id = btrim(tax_id) and char_length(tax_id) between 1 and 30)),
  address text check (address is null
    or (address = btrim(address) and char_length(address) between 1 and 200)),
  email text check (email is null
    or (email = btrim(email) and char_length(email) between 1 and 200)),
  created_at timestamptz not null default now(),
  -- Target of the keys of invoices and movements.
  unique (id, user_id)
);

alter table clients enable row level security;

create policy "owner all clients" on clients
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
