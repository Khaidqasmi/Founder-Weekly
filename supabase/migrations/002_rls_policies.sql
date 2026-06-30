-- Enable RLS on all tables
alter table profiles enable row level security;
alter table workspaces enable row level security;
alter table workspace_members enable row level security;
alter table trial_subscriptions enable row level security;
alter table orders enable row level security;
alter table ads enable row level security;
alter table leads enable row level security;
alter table inventory enable row level security;
alter table action_items enable row level security;
alter table reports enable row level security;
alter table report_email_logs enable row level security;
alter table csv_uploads enable row level security;
alter table admin_notes enable row level security;
alter table integration_connections enable row level security;
alter table integration_sync_logs enable row level security;

-- Helper function to check workspace membership
create or replace function is_workspace_member(ws_id uuid)
returns boolean as $$
  select exists (
    select 1 from workspace_members
    where workspace_id = ws_id and user_id = auth.uid()
  );
$$ language sql security definer stable;

-- Helper function to check if user is admin
create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

-- PROFILES
create policy "Users can view own profile"
  on profiles for select using (id = auth.uid() or is_admin());

create policy "Users can update own profile"
  on profiles for update using (id = auth.uid());

create policy "Users can insert own profile"
  on profiles for insert with check (id = auth.uid());

create policy "Admins can view all profiles"
  on profiles for select using (is_admin());

-- WORKSPACES
create policy "Users can view own workspaces"
  on workspaces for select using (is_workspace_member(id) or is_admin());

create policy "Users can create workspaces"
  on workspaces for insert with check (owner_id = auth.uid());

create policy "Owners can update workspaces"
  on workspaces for update using (owner_id = auth.uid());

-- WORKSPACE MEMBERS
create policy "Members can view workspace members"
  on workspace_members for select using (is_workspace_member(workspace_id) or is_admin());

create policy "Owners can manage members"
  on workspace_members for insert with check (
    exists (select 1 from workspaces where id = workspace_id and owner_id = auth.uid())
    or user_id = auth.uid()
  );

-- TRIAL SUBSCRIPTIONS
create policy "Members can view trial"
  on trial_subscriptions for select using (is_workspace_member(workspace_id) or is_admin());

create policy "System can insert trial"
  on trial_subscriptions for insert with check (
    exists (select 1 from workspaces where id = workspace_id and owner_id = auth.uid())
  );

-- Workspace data policies (orders, ads, leads, inventory, action_items)
-- Pattern: members can CRUD their workspace data, admins can read all

-- ORDERS
create policy "orders_select" on orders for select using (is_workspace_member(workspace_id) or is_admin());
create policy "orders_insert" on orders for insert with check (is_workspace_member(workspace_id));
create policy "orders_update" on orders for update using (is_workspace_member(workspace_id));
create policy "orders_delete" on orders for delete using (is_workspace_member(workspace_id));

-- ADS
create policy "ads_select" on ads for select using (is_workspace_member(workspace_id) or is_admin());
create policy "ads_insert" on ads for insert with check (is_workspace_member(workspace_id));
create policy "ads_update" on ads for update using (is_workspace_member(workspace_id));
create policy "ads_delete" on ads for delete using (is_workspace_member(workspace_id));

-- LEADS
create policy "leads_select" on leads for select using (is_workspace_member(workspace_id) or is_admin());
create policy "leads_insert" on leads for insert with check (is_workspace_member(workspace_id));
create policy "leads_update" on leads for update using (is_workspace_member(workspace_id));
create policy "leads_delete" on leads for delete using (is_workspace_member(workspace_id));

-- INVENTORY
create policy "inventory_select" on inventory for select using (is_workspace_member(workspace_id) or is_admin());
create policy "inventory_insert" on inventory for insert with check (is_workspace_member(workspace_id));
create policy "inventory_update" on inventory for update using (is_workspace_member(workspace_id));
create policy "inventory_delete" on inventory for delete using (is_workspace_member(workspace_id));

-- ACTION ITEMS
create policy "action_items_select" on action_items for select using (is_workspace_member(workspace_id) or is_admin());
create policy "action_items_insert" on action_items for insert with check (is_workspace_member(workspace_id));
create policy "action_items_update" on action_items for update using (is_workspace_member(workspace_id));
create policy "action_items_delete" on action_items for delete using (is_workspace_member(workspace_id));

-- REPORTS
create policy "reports_select" on reports for select using (is_workspace_member(workspace_id) or is_admin());
create policy "reports_insert" on reports for insert with check (is_workspace_member(workspace_id));

-- REPORT EMAIL LOGS
create policy "report_email_logs_select" on report_email_logs for select using (is_workspace_member(workspace_id) or is_admin());
create policy "report_email_logs_insert" on report_email_logs for insert with check (is_workspace_member(workspace_id));

-- CSV UPLOADS
create policy "csv_uploads_select" on csv_uploads for select using (is_workspace_member(workspace_id) or is_admin());
create policy "csv_uploads_insert" on csv_uploads for insert with check (is_workspace_member(workspace_id));

-- ADMIN NOTES
create policy "admin_notes_select" on admin_notes for select using (is_admin());
create policy "admin_notes_insert" on admin_notes for insert with check (is_admin());
create policy "admin_notes_update" on admin_notes for update using (is_admin());
create policy "admin_notes_delete" on admin_notes for delete using (is_admin());

-- INTEGRATION CONNECTIONS
create policy "integration_connections_select" on integration_connections for select using (is_workspace_member(workspace_id) or is_admin());
create policy "integration_connections_insert" on integration_connections for insert with check (is_workspace_member(workspace_id));
create policy "integration_connections_update" on integration_connections for update using (is_workspace_member(workspace_id));

-- INTEGRATION SYNC LOGS
create policy "integration_sync_logs_select" on integration_sync_logs for select using (is_workspace_member(workspace_id) or is_admin());
