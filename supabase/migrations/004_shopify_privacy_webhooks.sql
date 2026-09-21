-- Track Shopify customer IDs only for privacy/redaction matching. This value is
-- never shown in the UI and lets mandatory Shopify privacy webhooks remove PII.
alter table orders add column if not exists shopify_customer_id text default '';
create index if not exists idx_orders_shopify_customer
  on orders(workspace_id, shopify_customer_id)
  where shopify_customer_id <> '';

create table if not exists privacy_requests (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces(id) on delete cascade,
  provider text not null,
  request_type text not null,
  external_customer_id text default '',
  status text not null default 'received',
  requested_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table privacy_requests enable row level security;

create policy "privacy_requests_select" on privacy_requests
  for select using (is_workspace_member(workspace_id) or is_admin());

create policy "privacy_requests_update" on privacy_requests
  for update using (is_admin());
