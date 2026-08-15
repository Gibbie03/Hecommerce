-- Migration 0006 fixed the helper functions, but claiming still recursed:
-- "creator_can_self_insert_as_owner" contained a raw NOT EXISTS subquery
-- directly against business_members, which (unlike the security-definer
-- helpers) is evaluated under the caller's own RLS — triggering
-- business_members' SELECT policy while business_members' INSERT policy is
-- still being resolved. Moving that check into its own SECURITY DEFINER
-- plpgsql function (same fix pattern as 0006) removes the last raw
-- self-referencing subquery from this table's policies.
create or replace function business_has_no_members(target_business_id uuid) returns boolean
  language plpgsql stable security definer
  set search_path = public
  as $$
  declare
    has_members boolean;
  begin
    select exists(select 1 from business_members where business_id = target_business_id) into has_members;
    return not has_members;
  end;
  $$;

drop policy "creator_can_self_insert_as_owner" on business_members;

create policy "creator_can_self_insert_as_owner" on business_members
  for insert with check (
    user_id = auth.uid()
    and role = 'owner'
    and business_has_no_members(business_id)
  );
