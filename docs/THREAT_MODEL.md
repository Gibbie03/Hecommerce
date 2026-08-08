# Threat Model (planning draft)

**Status:** design notes, not tied to implemented code yet. Revisit and
sharpen this once the schema and API surface actually exist.

## Assets

- Tenant (merchant) data: products, inventory, customers, orders, revenue.
- Customer PII: names, addresses, order history.
- Payment reconciliation data and payment-provider secrets.
- Platform-admin capabilities (cross-tenant access, billing, support tooling).
- Credentials: Supabase service-role key, JWT signing secret, webhook
  signing secrets, payment provider API keys.

## Actors

- Anonymous visitor (storefront browsing).
- Authenticated customer.
- Tenant staff: `staff` / `manager` / `admin` / `owner`.
- Platform staff: `support` / `security` / `platform_admin`.
- External systems: payment provider webhooks.
- Malicious actor: any of the above, acting in bad faith, or an outsider
  with no account at all.

## Threats and mitigations

### Cross-tenant data access
**Threat:** A user in Tenant A reads, writes, deletes, or enumerates Tenant
B's rows by manipulating an object ID, request body, or query param.
**Mitigation:** RLS on every tenant table, tenant membership resolved via a
`tenant_members` lookup inside the policy — never from a client-supplied or
JWT-cached `tenant_id`. See `docs/DATABASE_SECURITY.md`.
**Test:** for every new table, attempt read/update/delete/enumerate as a
different tenant's authenticated user; all must fail.

### Client-side privilege escalation
**Threat:** A request body includes `role: "owner"` or `is_admin: true` and
the server trusts it.
**Mitigation:** role changes go through a server-side authorization check
that verifies the *actor's* existing role permits the change; role is never
read from client input as the source of truth.

### Platform/merchant boundary confusion
**Threat:** A merchant owner reaches a platform-admin-only operation because
role checks conflate the two role spaces.
**Mitigation:** platform roles and merchant roles are structurally separate
tables/enums, checked independently; no code path treats `owner` (merchant)
as sufficient for a platform-admin action.

### Forged or replayed payment webhooks
**Threat:** An attacker POSTs a fake "payment succeeded" event, or replays a
real one against a different order.
**Mitigation:** signature verification, transaction-reference-to-order
matching, amount/currency check, idempotency. See `SECURITY_RULES.md` §7.

### Client-trusted payment status
**Threat:** Frontend calls "mark order paid" directly after redirect from
checkout, without server-side confirmation.
**Mitigation:** orders are marked paid only by the webhook handler (or an
explicit server-side verification call to the provider), never by a client
request.

### Secret leakage
**Threat:** Service-role key or payment secret ends up in a client bundle,
git history, or an error response.
**Mitigation:** secrets only in server-side env/secret manager; error
responses never include internal detail; periodic dependency/secret
scanning once CI exists.

### Session/role staleness
**Threat:** A user demoted or removed from a tenant keeps using an
already-issued JWT that still implies old access.
**Mitigation:** don't bake role/tenant into long-lived JWT claims as the
authorization source of truth — re-check membership/role from
`tenant_members` on each request via RLS, not from token contents.

### File upload abuse
**Threat:** Path traversal, oversized files, executable content disguised
via MIME type, or cross-tenant file access via bucket misconfiguration.
**Mitigation:** server-side type/size validation, safe generated filenames,
tenant-scoped storage paths, private buckets + signed URLs for anything
non-public.

### Brute force / abuse of public endpoints
**Threat:** Credential stuffing on login, OTP brute force, checkout/coupon
abuse, webhook flooding.
**Mitigation:** rate limiting at the edge (Cloudflare) and/or in edge
functions on every sensitive endpoint listed in `SECURITY_RULES.md` §11.

### Host header / domain spoofing for multi-tenant storefronts
**Threat:** A request claims to be for Tenant A's storefront domain but is
actually routed to serve Tenant B's data, or vice versa.
**Mitigation:** resolve tenant from the verified host header server-side
against a domain→tenant mapping table; never trust a tenant slug passed as
a request parameter for storefront rendering.

## Out of scope for this doc (revisit later)

- Physical/infra security of hosting provider (delegated to Supabase/Cloudflare).
- Detailed DDoS mitigation strategy beyond edge rate limiting.
- Compliance requirements (PCI scope should stay minimal since card data
  never touches our systems, but this needs revisiting once a payment
  provider is chosen).
