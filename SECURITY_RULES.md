# Security Rules

**Status: planning reference.** This repo has no application code yet. These
rules exist so that whenever building starts — by a human or an AI coding
agent — the security model is decided in advance instead of improvised under
deadline pressure.

> Read this file before writing or modifying any code in this project.
> These rules override convenience. If a rule is unclear or a case isn't
> covered, stop and ask rather than guessing.

See also: `docs/SECURITY_ARCHITECTURE.md`, `docs/THREAT_MODEL.md`,
`docs/DATABASE_SECURITY.md`.

---

## Non-negotiable rule

Security is part of the architecture, not a feature added later. Never trade
away authentication, authorization, tenant isolation, input validation, or
secret protection for development speed.

---

## 1. Multi-tenant isolation

- Every tenant-owned table has a `tenant_id` column and RLS enabled from the
  migration that creates it — not added later.
- Tenant membership is resolved **inside the RLS policy**, via a lookup
  against `tenant_members` keyed on `auth.uid()`. Never derive `tenant_id`
  from a JWT custom claim or from a value the client sends — see
  `docs/DATABASE_SECURITY.md` for why (stale claims survive role changes and
  removals).
- A user in Tenant A must never be able to read, write, delete, or enumerate
  Tenant B's rows — including by manipulating request bodies, query params,
  or object IDs directly.
- If storefronts are served on tenant subdomains or custom domains, the host
  header must be verified server-side against the claimed tenant; never trust
  a client-supplied tenant slug.

## 2. Authentication

- Use Supabase Auth; never hand-roll password storage.
- MFA required for platform administrators and merchant owners.
- Never expose auth secrets (service-role key, JWT signing secret) to the
  client.
- Password reset and login flows must not reveal whether an email exists.

## 3. Authorization

Every protected operation checks, in order: authenticated → belongs to the
relevant tenant → role permits the action → has access to this specific
resource. Frontend checks are UX only; the database/API layer is the actual
gate. A user's own client can never change its own role.

## 4. Roles

Least privilege. Explicit roles (`owner`, `admin`, `manager`, `staff`);
platform-level roles (`platform_admin`, `support`, `security`) are a
**separate** set — never overlapping with merchant roles, never settable by
a merchant-side request.

## 5. Database / Supabase

- RLS on before any client-facing access to a table.
- No unsanitized SQL built from user input.
- Service-role key stays server-side only — never in a browser bundle, never
  logged.
- `SECURITY DEFINER` functions only when necessary, with `search_path`
  pinned explicitly.
- A migration that adds a table without RLS should fail CI (see
  `scripts/check_rls.sql`) once there's a pipeline to run it in.

## 6. Payments

- Never store card numbers, CVV, or full payment credentials — use the
  provider's tokenized checkout.
- Payment status is never trusted from the client. The order is marked paid
  only after server-side verification against the provider.

## 7. Webhooks

Every webhook handler: verifies the provider's signature, validates the
event shape, checks the transaction reference against a known order, checks
amount and currency match, and is idempotent (safe to receive the same event
twice). Forged or malformed payloads are rejected, not logged-and-ignored.

## 8. Secrets

No API keys, DB passwords, payment secrets, webhook secrets, JWT secrets, or
service-role keys in source, commit history, logs, or error responses.
Environment variables / secret manager only.

## 9. Input validation

Every external input (type, format, length, range, ownership) is validated
server-side regardless of client-side validation. Never trust client-supplied
prices, roles, tenant IDs, permissions, or payment status.

## 10. File uploads

Validate type/size/extension server-side (not by trusting client MIME type),
generate safe filenames, prevent path traversal, store tenant files under a
tenant-scoped prefix, keep sensitive files in a private bucket served via
signed URLs.

## 11. Rate limiting

Apply to login, signup, password reset, OTP, checkout, coupon validation,
payment endpoints, and webhooks. Supabase does not provide this for you on
RPC/API calls — plan for it at the edge (Cloudflare) or in an edge function.

## 12. Audit logging

Log role changes, staff add/remove, product/order deletion, payment-setting
changes, and admin actions, with actor, tenant, and timestamp. Ordinary users
cannot edit or delete audit log rows.

## 13. Error handling

Never return stack traces, SQL errors, secrets, or internal paths to the
client. Log details server-side only.

---

## Before implementing a feature, answer:

1. What data does this feature touch, and how sensitive is it (public /
   customer-private / merchant-private / highly sensitive)?
2. Which tenant owns that data, and how is that tenant derived?
3. Which roles may access it?
4. What happens if the client sends a malicious or malformed request?
5. What specifically prevents cross-tenant access here?
6. What secrets does this touch, and where do they live?
7. What security tests does this need?

## Before calling a feature done:

```
[ ] Authentication reviewed
[ ] Authorization reviewed
[ ] Tenant isolation reviewed (cross-tenant read/write/delete/enumerate tested)
[ ] RLS policies reviewed
[ ] Input validation implemented server-side
[ ] Secrets reviewed (nothing hardcoded, nothing leaked to client)
[ ] Payment/webhook security reviewed, if applicable
[ ] Rate limiting reviewed, if applicable
[ ] Error messages reviewed for leakage
[ ] Security/negative tests written
```

If any answer is "unknown," stop and ask rather than assuming.
