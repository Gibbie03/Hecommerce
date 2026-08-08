# Database Security (planning draft)

**Status:** patterns to follow once schema work starts. The SQL here
(`supabase/migrations/0001_tenant_foundation.sql`) is a reference template,
not a migration that's been run against a real project yet.

## Core pattern: resolve tenant membership inside the policy

Don't derive `tenant_id` from a JWT custom claim and don't trust a
`tenant_id` sent by the client. Both are stale-able: a claim baked into a
long-lived JWT doesn't reflect a role change or removal until the token is
refreshed, and a client-sent value is just an assertion.

Instead, every RLS policy resolves membership live, per request, against
`tenant_members`:

```sql
create policy "tenant_isolation_select" on products
  for select
  using (
    tenant_id in (
      select tenant_id from tenant_members where user_id = auth.uid()
    )
  );
```

This means a user removed from a tenant loses access on their very next
request, not whenever their token happens to expire.

## Role checks compose with tenant checks

Tenant membership answers "can this user see this tenant's data at all."
Role answers "what can they do with it." Keep them as separate predicates so
each is easy to audit:

```sql
create policy "tenant_staff_can_delete_products" on products
  for delete
  using (
    tenant_id in (
      select tenant_id from tenant_members
      where user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );
```

## Platform admin is not a merchant role

Platform-level operations should not be reachable through the same
`tenant_members.role` check at all — they check a separate
`platform_members` (or equivalent) table, so there's no shared code path
where a merchant `owner` and a `platform_admin` could be confused.

## Performance note

A subquery against `tenant_members` on every row check is fine at small
scale; revisit with an indexed `(user_id, tenant_id)` and, if needed, a
`security definer` helper function (`current_tenant_ids()`) once query plans
matter. Don't reach for a JWT-cached claim as a performance shortcut — it
reintroduces the staleness problem above.

## CI enforcement (once there's a pipeline)

A table that's been created without RLS enabled is invisible until someone
notices in review. `scripts/check_rls.sql` is a query that lists any table
in tenant-owned schemas without RLS enabled — wire it into CI as soon as
there's a CI to wire it into, so a missing `enable row level security` fails
the build instead of shipping.

## Storage

Buckets follow the same tenant-scoping idea as tables: private files live
under a `{tenant_id}/...` path prefix, and storage policies check that
prefix against `tenant_members` the same way table RLS does. Public buckets
(product images, logos) don't need this, but should still be separate
buckets from anything private — don't mix classification levels in one
bucket relying on per-object policy alone.

## `SECURITY DEFINER` functions

Use only when a policy genuinely needs to check something outside the
calling user's own row-visibility (e.g. a cross-tenant platform-admin
lookup). Always pin `search_path` explicitly in the function definition —
an unpinned search path is a privilege-escalation vector.
