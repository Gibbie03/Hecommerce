# Security Architecture (planning draft)

**Status:** design notes for a multi-tenant commerce platform. No application
code exists yet — this describes the intended shape so the first
implementation follows it instead of inventing it ad hoc.

## Guiding principle

> The storefront can be customized freely; the security boundary cannot.

Frontend code is where merchants and AI-assisted iteration move fast.
Tenant isolation, authorization, and payment integrity live in the database
and server-side code, where they can't be bypassed by editing a page.

## Shape

```
Internet
   |
Cloudflare / DNS  (TLS, rate limiting at the edge)
   |
Web application
   |
   +-- Storefront UI (public + customer-authenticated)
   +-- Admin UI (merchant staff + platform admin)
   |
API / RPC layer  (auth check, authorization check, input validation)
   |
Supabase Auth  (identity)
   |
PostgreSQL + RLS  (tenant isolation enforced here, not in app code)
   |
   +-- tenants, tenant_members
   +-- products, inventory
   +-- orders, payments
   +-- customers
   |
Edge Functions
   |
   +-- payment provider integration
   +-- webhook handlers
   +-- transactional email
```

The database is the tenant-isolation boundary. The API layer is the
authorization boundary. Neither is optional, and neither can be replaced by
a frontend check — frontend checks are UX, not security.

## Tenant model

```
tenants (id, name, slug, status, created_at)
tenant_members (id, tenant_id, user_id, role)   -- role: owner/admin/manager/staff
```

Every tenant-owned table (`products`, `orders`, `customers`, `inventory`, …)
carries a `tenant_id` foreign key. See `docs/DATABASE_SECURITY.md` for how
RLS uses `tenant_members` to resolve "which tenant does this request belong
to" without trusting anything the client sends.

Platform administration (`platform_admin`, `support`, `security`) is a
**separate** role space from merchant roles — a merchant owner is never
structurally capable of reaching platform-admin operations, not just
prevented by a UI check.

## Data classification

| Class | Examples | Access |
|---|---|---|
| Public | store name, logo, published products, policies | anyone |
| Customer-private | customer name, email, address, order history | that customer + tenant staff with role |
| Merchant-private | revenue, customer list, inventory, suppliers, analytics | tenant staff by role |
| Highly sensitive | auth credentials, payment secrets, API keys, webhook secrets | server-side only, never leaves the backend |

Classify data before deciding who/what can touch it — this drives both RLS
policy design and what's safe to put in an API response at all.

## Payments

Card data never touches our database. Checkout is delegated to the payment
provider's hosted/tokenized flow; we store only reconciliation data:

```
payments (id, order_id, provider, provider_reference, amount, currency, status)
```

An order is marked paid only after server-side verification of a webhook
event — never because the browser says checkout succeeded.

## Webhooks

Webhook endpoints verify the provider's signature, validate the event
structure, confirm the transaction reference maps to a real order, confirm
amount/currency match, and are idempotent. See `SECURITY_RULES.md` §7.

## Secrets

Supabase's `service_role` key and any payment/webhook secrets are
server-side only (edge functions / server env), never in client bundles,
never logged. The anon/public key is the only Supabase key the browser ever
sees, and it's only safe because RLS is enforced on every table it can
reach.

## File uploads

Product images and public assets can be public. Invoices, customer
documents, and anything merchant-private go in a private bucket, served via
short-lived signed URLs, under a tenant-scoped path prefix
(`{tenant_id}/...`) so a policy mistake degrades to "wrong prefix visible"
rather than "everything visible."

## Rate limiting

Not something Supabase provides for free on API/RPC calls. Plan for
Cloudflare rate-limiting rules (or an edge-function counter) in front of
login, signup, password reset, OTP, checkout, coupon validation, and payment
endpoints before any of those go live.

## Audit logging

```
audit_logs (id, tenant_id, actor_id, action, resource_type, resource_id, ip_address, created_at)
```

Append-only from the application's perspective — no update/delete path
exposed to ordinary tenant roles.

## What "done" looks like for v1

Per the original design discussion, the four things to get right before
onboarding any real merchant: **tenant isolation, RLS, authentication, and
payment architecture.** Everything else (audit logs, rate limiting, file
upload hardening, etc.) can be layered on incrementally once those four are
solid.
