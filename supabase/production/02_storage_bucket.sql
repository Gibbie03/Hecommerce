-- Run any time after 01_role_and_grants.sql, as the same owner connection.
-- Creates the public bucket business_images — product/business photos are
-- meant to be publicly viewable on the storefront, matching local dev's
-- behavior of serving public/uploads/* statically with no auth check.
--
-- Uploads themselves go through the app's service-role client
-- (lib/supabase/admin.ts, lib/upload.ts) *after* the app has already
-- authorized the request via the RLS-protected business_images insert
-- (see supabase/migrations/0003_icommerce_schema.sql's
-- "staff_can_write_images" policy) — so no Storage RLS policy is required
-- for the security model to hold. The read policy below is defense in
-- depth, not the actual gate.
--
-- Note: this references storage.buckets/storage.objects, which only exist
-- on a real Supabase project (the Storage extension isn't present in this
-- repo's local dev Postgres) — this file can't be dry-run locally the way
-- 01_role_and_grants.sql was; verify the bucket appears under
-- Storage > business-images in the dashboard afterward.

insert into storage.buckets (id, name, public)
values ('business-images', 'business-images', true)
on conflict (id) do nothing;

drop policy if exists "public_can_read_business_images" on storage.objects;
create policy "public_can_read_business_images"
  on storage.objects for select
  using (bucket_id = 'business-images');
