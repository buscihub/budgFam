-- Review of tasks 1.5/1.5c: transactions_delete said "the owner, or any admin",
-- with no word about visibility. It leaned on the select policy to hide other
-- people's private rows, but Postgres applies the select policy to a DELETE only
-- when the statement reads a column (WHERE/RETURNING). A DELETE with no
-- condition reads none, so an admin could remove private movements of other
-- members, against §7 ("admins get no exception for private movements").
--
-- Now the policy itself says it: you delete your own movements; an admin also
-- deletes shared ones of other members, never their private ones.

drop policy transactions_delete on transactions;
create policy transactions_delete on transactions for delete using (
  is_member(household_id)
  and (owner_id = auth.uid() or (is_admin(household_id) and visibility = 'shared'))
);
