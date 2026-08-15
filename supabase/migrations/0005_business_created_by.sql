-- Fixes a real bug found during end-to-end testing: `insert ... returning *`
-- on businesses failed RLS even for the authenticated creator, because
-- Postgres checks RETURNING rows against the table's SELECT policies, and
-- at insert time the business has no business_members row yet (that insert
-- happens in the next statement) — so neither the "published" nor the
-- "current member" SELECT policy matched the brand-new draft row.
--
-- created_by (defaulting to auth.uid(), so callers don't need to pass it
-- explicitly) plus a matching SELECT policy closes that gap: the creator
-- can see their own row immediately, before membership is attached.
alter table businesses add column created_by uuid references auth.users (id) default auth.uid();

create policy "creator_can_view_own_new_business" on businesses
  for select using (created_by = auth.uid());
