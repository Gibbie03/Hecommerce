-- Fixes a real bug found during end-to-end testing: claiming a business
-- threw "infinite recursion detected in policy for relation
-- business_members". Root cause is a well-known Postgres/RLS footgun —
-- simple `language sql` functions are eligible for planner inlining, and
-- once inlined, the SECURITY DEFINER privilege escalation is lost, so the
-- helper's internal query against business_members gets subjected to
-- business_members' own RLS policies again (which call the helper again).
--
-- `plpgsql` functions are opaque to the planner and are never inlined, so
-- they reliably keep executing as their owner (postgres, RLS-exempt) —
-- the standard fix for this exact class of bug.
create or replace function current_business_ids() returns setof uuid
  language plpgsql stable security definer
  set search_path = public
  as $$
  begin
    return query select business_id from business_members where user_id = auth.uid();
  end;
  $$;

create or replace function current_business_role(target_business_id uuid) returns business_role
  language plpgsql stable security definer
  set search_path = public
  as $$
  declare
    result business_role;
  begin
    select role into result from business_members
    where business_id = target_business_id and user_id = auth.uid()
    limit 1;
    return result;
  end;
  $$;
