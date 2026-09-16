-- Fiscal data needed to issue a real invoice.
--
-- Until now `clients` held only a name and `user_settings` only tax rates and
-- numbering, so there was nothing to print on an invoice: neither who is
-- billing nor who is being billed.

-- ---------------------------------------------------------------------
-- 1. Who is being billed.
-- ---------------------------------------------------------------------

alter table clients add column if not exists tax_id text;
alter table clients add column if not exists address text;
alter table clients add column if not exists email text;

-- ---------------------------------------------------------------------
-- 2. Who is billing (the issuer — you).
--
-- These live on user_settings rather than a new table: there is exactly one
-- issuer per user, so a second table would only add a join.
-- ---------------------------------------------------------------------

alter table user_settings add column if not exists issuer_name text;
alter table user_settings add column if not exists issuer_tax_id text;
alter table user_settings add column if not exists issuer_address text;
alter table user_settings add column if not exists issuer_email text;
alter table user_settings add column if not exists issuer_phone text;
alter table user_settings add column if not exists issuer_iban text;

-- Shown on the invoice under the IBAN. Free text so it can say something other
-- than a transfer later without a migration.
alter table user_settings
  add column if not exists payment_method text not null default 'Transferencia bancaria';

-- Path inside the `branding` storage bucket, not a URL: the bucket is private,
-- so the app signs a short-lived URL when it needs to render the logo.
alter table user_settings add column if not exists logo_path text;

-- Default gap between issue date and due date, applied when creating an invoice.
alter table user_settings
  add column if not exists default_due_days int not null default 30;

-- ---------------------------------------------------------------------
-- 3. Private bucket for the logo.
--
-- Created here so there is no manual setup step in the Supabase dashboard.
-- Objects live under `<user_id>/...`, and the policies below are what keep one
-- user out of another's folder.
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('branding', 'branding', false)
on conflict (id) do nothing;

drop policy if exists "branding owner select" on storage.objects;
create policy "branding owner select" on storage.objects for select
  using (bucket_id = 'branding' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "branding owner insert" on storage.objects;
create policy "branding owner insert" on storage.objects for insert
  with check (bucket_id = 'branding' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "branding owner update" on storage.objects;
create policy "branding owner update" on storage.objects for update
  using (bucket_id = 'branding' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'branding' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "branding owner delete" on storage.objects;
create policy "branding owner delete" on storage.objects for delete
  using (bucket_id = 'branding' and (storage.foldername(name))[1] = auth.uid()::text);
