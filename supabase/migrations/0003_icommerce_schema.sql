-- Icommerce business-identity schema.
--
-- Supersedes the generic marketplace shape sketched in
-- 0001_tenant_foundation.sql (orders/payments), which modeled a different
-- product (checkout-capable multi-tenant commerce) than this MVP builds.
-- That file is left in place as historical reference only; nothing here
-- depends on it.
--
-- RLS pattern follows docs/DATABASE_SECURITY.md: membership is resolved
-- live per-request via `business_members`, never from a client-sent id or
-- a baked-in JWT claim. `current_business_ids()` is a SECURITY DEFINER
-- helper (owned by the migration role, which owns these tables) so it can
-- read `business_members` directly without recursing back through this
-- same table's own RLS policy — matches the "Performance note" in that doc.

create type provenance as enum (
  'verified', 'merchant_provided', 'merchant_confirmed', 'imported', 'third_party', 'unknown'
);

create type business_role as enum ('owner', 'admin', 'manager', 'staff');
create type business_status as enum ('draft', 'published');
create type verification_status as enum ('unverified', 'pending', 'verified');
create type verification_method as enum ('whatsapp', 'phone', 'email', 'document', 'manual');
create type product_availability as enum ('available', 'unavailable', 'unknown');
create type source_type as enum ('website', 'whatsapp', 'instagram', 'facebook', 'jumia', 'shopify', 'bumpa');
create type source_status as enum ('connected', 'pending');

create table businesses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category text,
  description text,
  status business_status not null default 'draft',
  verification_status verification_status not null default 'unverified',
  verification_method verification_method,
  verified_at timestamptz,
  phone text,
  whatsapp text,
  email text,
  website text,
  address text,
  city text,
  state text,
  opening_hours jsonb not null default '{}'::jsonb,
  delivery_info jsonb not null default '{}'::jsonb,
  policies text,
  field_provenance jsonb not null default '{}'::jsonb,
  ai_ready_score integer not null default 0,
  view_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index businesses_status_idx on businesses (status);

create table business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role business_role not null default 'owner',
  created_at timestamptz not null default now(),
  unique (business_id, user_id)
);

create index business_members_user_id_idx on business_members (user_id);
create index business_members_business_id_idx on business_members (business_id);

create or replace function current_business_ids() returns setof uuid
  language sql stable security definer
  set search_path = public
  as $$
    select business_id from business_members where user_id = auth.uid();
  $$;

create or replace function current_business_role(target_business_id uuid) returns business_role
  language sql stable security definer
  set search_path = public
  as $$
    select role from business_members
    where business_id = target_business_id and user_id = auth.uid()
    limit 1;
  $$;

create table products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  name text not null,
  description text,
  price_cents integer check (price_cents is null or price_cents >= 0),
  currency text not null default 'NGN',
  availability product_availability not null default 'unknown',
  price_source provenance not null default 'unknown',
  availability_source provenance not null default 'unknown',
  price_updated_at timestamptz,
  availability_updated_at timestamptz,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_business_id_idx on products (business_id);

create table business_images (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  product_id uuid references products (id) on delete cascade,
  url text not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create index business_images_business_id_idx on business_images (business_id);
create index business_images_product_id_idx on business_images (product_id);

create table business_sources (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  type source_type not null,
  value text,
  status source_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (business_id, type)
);

create table verification_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  method verification_method not null,
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected')),
  code_hash text,
  target text,
  expires_at timestamptz,
  requested_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  verified_at timestamptz
);

create index verification_requests_business_id_idx on verification_requests (business_id);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  author_name text not null,
  rating integer not null check (rating between 1 and 5),
  body text,
  created_at timestamptz not null default now()
);

create index reviews_business_id_idx on reviews (business_id);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses (id) on delete cascade,
  actor_id uuid references auth.users (id),
  action text not null,
  resource_type text not null,
  resource_id uuid,
  created_at timestamptz not null default now()
);

create index audit_logs_business_id_idx on audit_logs (business_id);

-- ============================================================
-- Row level security
-- ============================================================

alter table businesses enable row level security;
alter table business_members enable row level security;
alter table products enable row level security;
alter table business_images enable row level security;
alter table business_sources enable row level security;
alter table verification_requests enable row level security;
alter table reviews enable row level security;
alter table audit_logs enable row level security;

-- businesses
create policy "public_can_view_published_businesses" on businesses
  for select using (status = 'published');

create policy "members_can_view_own_business" on businesses
  for select using (id in (select current_business_ids()));

create policy "authenticated_users_can_create_business" on businesses
  for insert with check (auth.uid() is not null);

create policy "admins_can_update_own_business" on businesses
  for update using (current_business_role(id) in ('owner', 'admin'));

create policy "owner_can_delete_own_business" on businesses
  for delete using (current_business_role(id) = 'owner');

-- business_members
create policy "members_can_view_own_roster" on business_members
  for select using (business_id in (select current_business_ids()));

create policy "creator_can_self_insert_as_owner" on business_members
  for insert with check (
    user_id = auth.uid()
    and role = 'owner'
    and not exists (select 1 from business_members bm where bm.business_id = business_members.business_id)
  );

create policy "admins_can_manage_roster" on business_members
  for insert with check (current_business_role(business_id) in ('owner', 'admin'));

create policy "admins_can_update_roster" on business_members
  for update using (current_business_role(business_id) in ('owner', 'admin'));

create policy "admins_can_remove_roster" on business_members
  for delete using (current_business_role(business_id) in ('owner', 'admin'));

-- products
create policy "public_can_view_published_products" on products
  for select using (
    business_id in (select id from businesses where status = 'published')
  );

create policy "members_can_view_own_products" on products
  for select using (business_id in (select current_business_ids()));

create policy "staff_can_write_products" on products
  for insert with check (current_business_role(business_id) in ('owner', 'admin', 'manager'));

create policy "staff_can_update_products" on products
  for update using (current_business_role(business_id) in ('owner', 'admin', 'manager'));

create policy "staff_can_delete_products" on products
  for delete using (current_business_role(business_id) in ('owner', 'admin', 'manager'));

-- business_images
create policy "public_can_view_published_images" on business_images
  for select using (
    business_id in (select id from businesses where status = 'published')
  );

create policy "members_can_view_own_images" on business_images
  for select using (business_id in (select current_business_ids()));

create policy "staff_can_write_images" on business_images
  for insert with check (current_business_role(business_id) in ('owner', 'admin', 'manager'));

create policy "staff_can_delete_images" on business_images
  for delete using (current_business_role(business_id) in ('owner', 'admin', 'manager'));

-- business_sources
create policy "members_can_view_own_sources" on business_sources
  for select using (business_id in (select current_business_ids()));

create policy "staff_can_manage_sources" on business_sources
  for insert with check (current_business_role(business_id) in ('owner', 'admin', 'manager'));

create policy "staff_can_update_sources" on business_sources
  for update using (current_business_role(business_id) in ('owner', 'admin', 'manager'));

-- verification_requests
create policy "members_can_view_own_verification" on verification_requests
  for select using (business_id in (select current_business_ids()));

create policy "staff_can_request_verification" on verification_requests
  for insert with check (current_business_role(business_id) in ('owner', 'admin'));

create policy "staff_can_update_own_verification" on verification_requests
  for update using (current_business_role(business_id) in ('owner', 'admin'));

-- reviews
create policy "public_can_view_reviews_of_published_business" on reviews
  for select using (
    business_id in (select id from businesses where status = 'published')
  );

create policy "members_can_view_own_reviews" on reviews
  for select using (business_id in (select current_business_ids()));

-- audit_logs — there is no separate trusted "service role" in this local
-- setup (see docs/DATABASE_SECURITY.md); every write, including audit
-- entries, happens as the authenticated member performing the action, so
-- the insert policy requires the row to be self-attributed. No update or
-- delete policy exists for any role — the log is append-only.
create policy "admins_can_view_own_audit_log" on audit_logs
  for select using (current_business_role(business_id) in ('owner', 'admin'));

create policy "members_can_write_own_audit_log" on audit_logs
  for insert with check (
    business_id in (select current_business_ids())
    and actor_id = auth.uid()
  );
