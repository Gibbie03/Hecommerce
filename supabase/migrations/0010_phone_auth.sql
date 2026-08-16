-- Adds phone as a second sign-in identity alongside email, since the
-- account currently has no Resend-verified domain (email OTP can't reach
-- real users yet) but does have Twilio (SMS OTP can). Email stays wired
-- for later — this is additive, not a replacement.

alter table auth.users alter column email drop not null;
alter table auth.users add column phone text unique;
alter table auth.users add constraint auth_users_identity_check
  check (email is not null or phone is not null);

alter table login_codes alter column email drop not null;
alter table login_codes add column phone text;
alter table login_codes add constraint login_codes_identity_check check (
  (email is not null and phone is null) or (email is null and phone is not null)
);
create index login_codes_phone_idx on login_codes (phone);
