-- Prevent an authenticated user from joining an arbitrary client's workspace.
alter policy "Owners can manage members" on public.workspace_members
  to authenticated
  with check (exists (
    select 1 from public.workspaces
    where workspaces.id = workspace_members.workspace_id
      and workspaces.owner_id = (select auth.uid())
  ));

-- Signup provisions profiles through the trusted service role. Profile edits
-- from the browser may only change contact fields, never grant administrator access.
revoke insert, update on public.profiles from anon, authenticated;
grant insert (id, full_name, email, phone, country) on public.profiles to authenticated;
grant update (full_name, email, phone, country) on public.profiles to authenticated;

alter policy "Users can insert own profile" on public.profiles
  to authenticated
  with check (id = (select auth.uid()) and role = 'user');

alter policy "Users can update own profile" on public.profiles
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

alter policy integration_connections_update on public.integration_connections
  to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
