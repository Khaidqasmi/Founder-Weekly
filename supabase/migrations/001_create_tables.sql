-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null,
  email text not null,
  phone text default '',
  country text default '',
  role text not null default 'user',
  created_at timestamptz not null default now()
);

-- Workspaces
create table workspaces (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references profiles(id) on delete cascade,
  business_name text not null,
  business_type text default '',
  website text default '',
  currency text not null default 'PKR',
  main_goal text default '',
  report_day text default 'Monday',
  report_time text default '09:00',
  report_email text default '',
  created_at timestamptz not null default now()
);

-- Workspace Members
create table workspace_members (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null default 'owner',
  created_at timestamptz not null default now(),
  unique(workspace_id, user_id)
);

-- Trial Subscriptions
create table trial_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  status text not null default 'active',
  trial_start timestamptz not null default now(),
  trial_end timestamptz not null,
  upgraded_at timestamptz,
  created_at timestamptz not null default now()
);

-- Orders
create table orders (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  order_date date not null,
  order_id text default '',
  customer_name text default '',
  city text default '',
  product_name text default '',
  sku text default '',
  quantity numeric not null default 0,
  selling_price numeric not null default 0,
  revenue numeric not null default 0,
  payment_method text default '',
  order_status text default 'Pending',
  cod_status text default 'N/A',
  courier_status text default '',
  return_status text default '',
  notes text default '',
  created_at timestamptz not null default now()
);

-- Ads
create table ads (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  date date not null,
  platform text default '',
  campaign_name text default '',
  ad_set_name text default '',
  ad_name text default '',
  ad_spend numeric not null default 0,
  impressions numeric not null default 0,
  reach numeric not null default 0,
  clicks numeric not null default 0,
  purchases numeric not null default 0,
  purchase_revenue numeric not null default 0,
  created_at timestamptz not null default now()
);

-- Leads
create table leads (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  date date not null,
  lead_source text default '',
  lead_name text default '',
  lead_phone text default '',
  lead_email text default '',
  lead_status text default 'New',
  lead_value numeric not null default 0,
  follow_up_status text default 'Pending',
  assigned_to text default '',
  notes text default '',
  created_at timestamptz not null default now()
);

-- Inventory
create table inventory (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  product_name text not null,
  sku text default '',
  current_stock numeric not null default 0,
  reorder_level numeric not null default 0,
  selling_price numeric not null default 0,
  cost_price numeric not null default 0,
  notes text default '',
  created_at timestamptz not null default now()
);

-- Action Items
create table action_items (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  action text not null,
  category text default '',
  priority text default 'Medium',
  reason text default '',
  expected_impact text default '',
  owner text default '',
  deadline date,
  status text not null default 'Pending',
  created_at timestamptz not null default now()
);

-- Reports
create table reports (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  week_start date not null,
  week_end date not null,
  revenue numeric not null default 0,
  orders_count numeric not null default 0,
  aov numeric not null default 0,
  ad_spend numeric not null default 0,
  ad_revenue numeric not null default 0,
  roas numeric not null default 0,
  cod_orders numeric not null default 0,
  confirmed_cod_orders numeric not null default 0,
  cod_confirmation_rate numeric not null default 0,
  cancelled_orders numeric not null default 0,
  cancellation_rate numeric not null default 0,
  top_product text default '',
  weak_product text default '',
  low_stock_products text default '',
  pending_followups numeric not null default 0,
  summary text default '',
  created_at timestamptz not null default now()
);

-- Report Email Logs
create table report_email_logs (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  report_id uuid not null references reports(id) on delete cascade,
  email_to text not null,
  status text not null default 'pending',
  sent_at timestamptz default now(),
  error_message text default ''
);

-- CSV Uploads
create table csv_uploads (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  file_name text not null,
  upload_type text not null,
  row_count numeric not null default 0,
  status text not null default 'pending',
  error_message text default '',
  created_at timestamptz not null default now()
);

-- Admin Notes
create table admin_notes (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  admin_id uuid not null references profiles(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now()
);

-- Integration Connections
create table integration_connections (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  provider text not null,
  status text not null default 'disconnected',
  access_token_encrypted text default '',
  refresh_token_encrypted text default '',
  shop_domain text default '',
  ad_account_id text default '',
  ga4_property_id text default '',
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  unique(workspace_id, provider)
);

-- Integration Sync Logs
create table integration_sync_logs (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  provider text not null,
  sync_type text not null,
  status text not null default 'pending',
  records_synced numeric not null default 0,
  error_message text default '',
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

-- Indexes for performance
create index idx_orders_workspace on orders(workspace_id);
create index idx_orders_date on orders(workspace_id, order_date);
create index idx_ads_workspace on ads(workspace_id);
create index idx_ads_date on ads(workspace_id, date);
create index idx_leads_workspace on leads(workspace_id);
create index idx_inventory_workspace on inventory(workspace_id);
create index idx_action_items_workspace on action_items(workspace_id);
create index idx_reports_workspace on reports(workspace_id);
create index idx_workspace_members_user on workspace_members(user_id);
create index idx_workspace_members_workspace on workspace_members(workspace_id);
