-- Historical reference only — superseded by 0002_auth_shim.sql and
-- 0003_icommerce_schema.sql, which implement the actual Icommerce
-- business-identity schema. This file modeled a different, more generic
-- multi-tenant marketplace (with orders/payments) that the product pivoted
-- away from; it is intentionally excluded from scripts/db-migrate.sh and
-- was never applied to a database. Left in place only to illustrate the
-- tenant/RLS pattern referenced by docs/DATABASE_SECURITY.md.

-- ============================================================
-- Tenants and membership
-- ============================================================

create table tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now()
);

create type tenant_role as enum ('owner', 'admin', 'manager', 'staff');

create table tenant_members (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role tenant_role not null,
  created_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);

create index tenant_members_user_id_idx on tenant_members (user_id);
create index tenant_members_tenant_id_idx on tenant_members (tenant_id);

-- Platform-level roles are a separate space from merchant roles.
-- A merchant "owner" must never satisfy a platform_members check.
create type platform_role as enum ('platform_admin', 'support', 'security');

create table platform_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role platform_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table tenants enable row level security;
alter table tenant_members enable row level security;
alter table platform_members enable row level security;

-- Members can see their own tenants; platform admins can see all.
create policy "tenant_members_can_view_their_tenant" on tenants
  for select
  using (
    id in (select tenant_id from tenant_members where user_id = auth.uid())
    or exists (
      select 1 from platform_members
      where user_id = auth.uid() and role = 'platform_admin'
    )
  );

create policy "members_can_view_own_tenant_roster" on tenant_members
  for select
  using (
    tenant_id in (select tenant_id from tenant_members where user_id = auth.uid())
  );

-- ============================================================
-- Example tenant-owned tables
-- ============================================================

create table products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  name text not null,
  price_cents integer not null check (price_cents >= 0),
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create index products_tenant_id_idx on products (tenant_id);

alter table products enable row level security;

-- Anyone can read published products (public storefront).
create policy "published_products_are_public" on products
  for select
  using (published = true);

-- Tenant staff can read all of their own tenant's products, published or not.
create policy "tenant_staff_can_view_own_products" on products
  for select
  using (
    tenant_id in (select tenant_id from tenant_members where user_id = auth.uid())
  );

-- Only admin/owner can create or modify products.
create policy "tenant_admins_can_write_products" on products
  for insert
  with check (
    tenant_id in (
      select tenant_id from tenant_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

create policy "tenant_admins_can_update_products" on products
  for update
  using (
    tenant_id in (
      select tenant_id from tenant_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

create policy "tenant_admins_can_delete_products" on products
  for delete
  using (
    tenant_id in (
      select tenant_id from tenant_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

create table orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  customer_id uuid not null references auth.users (id),
  status text not null default 'pending',
  total_cents integer not null check (total_cents >= 0),
  created_at timestamptz not null default now()
);

create index orders_tenant_id_idx on orders (tenant_id);
create index orders_customer_id_idx on orders (customer_id);

alter table orders enable row level security;

-- Customers can view only their own orders.
create policy "customers_can_view_own_orders" on orders
  for select
  using (customer_id = auth.uid());

-- Tenant staff can view orders that belong to their tenant.
create policy "tenant_staff_can_view_tenant_orders" on orders
  for select
  using (
    tenant_id in (select tenant_id from tenant_members where user_id = auth.uid())
  );

-- Payment reconciliation data — never card details. Written only by
-- server-side webhook handlers (service role), not directly by clients.
create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  provider text not null,
  provider_reference text not null,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  unique (provider, provider_reference)
);

alter table payments enable row level security;

-- No client-facing insert/update policy: payments are written exclusively
-- via the service role from a verified webhook handler.
create policy "tenant_staff_can_view_tenant_payments" on payments
  for select
  using (
    order_id in (
      select o.id from orders o
      where o.tenant_id in (
        select tenant_id from tenant_members where user_id = auth.uid()
      )
    )
  );

-- ============================================================
-- Audit log — append-only from the application's perspective
-- ============================================================

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants (id) on delete cascade,
  actor_id uuid references auth.users (id),
  action text not null,
  resource_type text not null,
  resource_id uuid,
  ip_address inet,
  created_at timestamptz not null default now()
);

create index audit_logs_tenant_id_idx on audit_logs (tenant_id);

alter table audit_logs enable row level security;

create policy "tenant_admins_can_view_audit_log" on audit_logs
  for select
  using (
    tenant_id in (
      select tenant_id from tenant_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- Intentionally no insert/update/delete policy for regular roles: audit
-- rows are written by server-side code via the service role only.
