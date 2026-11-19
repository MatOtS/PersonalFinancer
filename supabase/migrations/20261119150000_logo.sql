-- The logo of the issuer (work item 009). The file lives in the private bucket
-- `branding` (created by config.toml); the settings row remembers its path.
-- A user only reads and writes the objects of their own folder, the one named
-- after their id.

alter table user_settings add column logo_path text
  check (logo_path is null or char_length(logo_path) between 1 and 200);

create policy "owner reads own logo" on storage.objects
  for select to authenticated
  using (bucket_id = 'branding' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "owner uploads own logo" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'branding' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "owner replaces own logo" on storage.objects
  for update to authenticated
  using (bucket_id = 'branding' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'branding' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "owner deletes own logo" on storage.objects
  for delete to authenticated
  using (bucket_id = 'branding' and (storage.foldername(name))[1] = auth.uid()::text);
