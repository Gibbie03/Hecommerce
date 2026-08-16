-- Defense-in-depth hardening found during a security audit: the
-- verification_requests INSERT policy restricted *who* could request
-- verification (owner/admin) but not *what status* they could insert.
-- No current API route lets a client set status on insert (mutations.ts
-- always inserts 'pending' and only the server-side code-confirmation path
-- updates to 'verified'), so this isn't reachable through the app today —
-- but the policy itself shouldn't rely on every future call site getting
-- that right. Requiring status = 'pending' at the database layer means a
-- business can never appear "verified" without having gone through the
-- actual code-check flow, regardless of what any future code path sends.
drop policy "staff_can_request_verification" on verification_requests;

create policy "staff_can_request_verification" on verification_requests
  for insert with check (
    current_business_role(business_id) in ('owner', 'admin')
    and status = 'pending'
  );
