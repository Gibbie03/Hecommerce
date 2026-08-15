-- Same root cause as 0005, on a different table: `insert into
-- business_members (...) returning id` failed RLS because the only SELECT
-- policy (members_can_view_own_roster) determines visibility via a
-- subquery through current_business_ids(), which reflects the table state
-- as of the start of the command — it can't see the row this same INSERT
-- statement is still in the middle of creating. A direct column comparison
-- against the row itself (no subquery) doesn't have that problem, and is
-- also just a sensible baseline: a member can always see their own
-- membership row.
create policy "members_can_view_own_membership_row" on business_members
  for select using (user_id = auth.uid());
