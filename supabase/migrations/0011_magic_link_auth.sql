-- Email magic-link authentication. A separate table from login_codes
-- (not a column addition to it) because the consumption query needs to be
-- a single unconditional-on-uniqueness UPDATE — see lib/auth/magicLink.ts —
-- and because a link carries an optional onboarding continuation payload
-- that a 6-digit code never needs.
--
-- `continuation` holds the same shape /api/business/claim already accepts
-- (see lib/business/claimSchema.ts) so a user who started creating or
-- claiming a business before requesting the link lands back in the right
-- place after clicking it, without ever putting business data in the
-- email URL itself.
create table magic_links (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  token_hash text not null unique,
  continuation jsonb,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index magic_links_email_idx on magic_links (email);

-- Intentionally no RLS — same rationale as login_codes (see
-- 0002_auth_shim.sql): these rows are pre-authentication, there is no
-- auth.uid() yet to key a policy on, and the only client that ever queries
-- this table is the app's own server-side magic-link routes. Flagged by
-- scripts/check_rls.sql by design — reviewed, not an oversight.
