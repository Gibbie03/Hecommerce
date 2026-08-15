-- A narrow SECURITY DEFINER carve-out: anonymous visitors to a published
-- business site need to increment a view counter, but the businesses
-- UPDATE policy (admins_can_update_own_business) intentionally restricts
-- writes to owner/admin members. Rather than widen that policy, this
-- function does exactly one safe, non-sensitive thing — incrementing a
-- counter on an already-published row — and nothing else.
create or replace function increment_business_view_count(target_slug text) returns void
  language sql security definer
  set search_path = public
  as $$
    update businesses set view_count = view_count + 1 where slug = target_slug and status = 'published';
  $$;

grant execute on function increment_business_view_count(text) to icommerce_app;
