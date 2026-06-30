-- Add source tracking to data tables
alter table orders add column if not exists source text default 'manual';
alter table ads add column if not exists source text default 'manual';
alter table leads add column if not exists source text default 'manual';
alter table inventory add column if not exists source text default 'manual';

-- Index for fast date range queries
create index if not exists idx_orders_workspace_date on orders(workspace_id, order_date desc);
create index if not exists idx_ads_workspace_date on ads(workspace_id, date desc);
create index if not exists idx_orders_source on orders(workspace_id, source);
create index if not exists idx_ads_source on ads(workspace_id, source);

-- Sync history table — tracks every sync run
create table if not exists sync_runs (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  provider text not null,
  sync_type text not null,
  status text not null default 'running',
  records_fetched numeric default 0,
  records_new numeric default 0,
  records_updated numeric default 0,
  date_range_start date,
  date_range_end date,
  error_message text default '',
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index idx_sync_runs_workspace on sync_runs(workspace_id, started_at desc);

-- Enable RLS
alter table sync_runs enable row level security;

create policy "sync_runs_select" on sync_runs for select
  using (
    exists (select 1 from workspace_members where workspace_id = sync_runs.workspace_id and user_id = auth.uid())
    or exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "sync_runs_insert" on sync_runs for insert
  with check (
    exists (select 1 from workspace_members where workspace_id = sync_runs.workspace_id and user_id = auth.uid())
  );

create policy "sync_runs_update" on sync_runs for update
  using (
    exists (select 1 from workspace_members where workspace_id = sync_runs.workspace_id and user_id = auth.uid())
  );
