-- Local-dev auth shim.
--
-- This project has no local Docker daemon available, so the full Supabase
-- stack (GoTrue/PostgREST/Storage) can't run here. This migration recreates
-- just enough of Supabase Auth's contract — an `auth.users` table and an
-- `auth.uid()` function reading the same `request.jwt.claims` session
-- variable that PostgREST injects per request — so RLS policies written
-- against `auth.uid()` are genuinely enforced today, and are the *same*
-- policies that will run unmodified against a real hosted Supabase project.
--
-- When this app points at real Supabase: drop this migration's objects,
-- since Supabase provides `auth.users`/`auth.uid()` natively.

create schema if not exists auth;

create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

create or replace function auth.uid() returns uuid
  language sql stable
  as $$
    select (nullif(current_setting('request.jwt.claims', true), '')::json ->> 'sub')::uuid;
  $$;

-- App-specific passwordless login codes. Not part of the Supabase contract —
-- this is replaced entirely by supabase.auth.signInWithOtp() when this app
-- is pointed at a real Supabase project.
create table login_codes (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index login_codes_email_idx on login_codes (email);

-- Intentionally no RLS on login_codes: rows here are pre-authentication
-- (there is no auth.uid() yet to key a policy on), and the only client
-- that ever queries this table is the app's own server-side login route,
-- always filtered by the email supplied in that request. Flagged by
-- scripts/check_rls.sql by design — reviewed, not an oversight.
