export interface Profile {
  id: string
  full_name: string
  email: string
  phone: string
  country: string
  role: 'user' | 'admin'
  created_at: string
}

export interface Workspace {
  id: string
  owner_id: string
  business_name: string
  business_type: string
  website: string
  currency: string
  main_goal: string
  report_day: string
  report_time: string
  report_email: string
  created_at: string
}

export interface WorkspaceMember {
  id: string
  workspace_id: string
  user_id: string
  role: string
  created_at: string
}

export interface TrialSubscription {
  id: string
  workspace_id: string
  status: 'active' | 'expired' | 'upgraded'
  trial_start: string
  trial_end: string
  upgraded_at: string | null
  created_at: string
}

export interface Order {
  id: string
  workspace_id: string
  order_date: string
  order_id: string
  customer_name: string
  city: string
  product_name: string
  sku: string
  quantity: number
  selling_price: number
  revenue: number
  payment_method: string
  order_status: string
  cod_status: string
  courier_status: string
  return_status: string
  notes: string
  created_at: string
}

export interface Ad {
  id: string
  workspace_id: string
  date: string
  platform: string
  campaign_name: string
  ad_set_name: string
  ad_name: string
  ad_spend: number
  impressions: number
  reach: number
  clicks: number
  purchases: number
  purchase_revenue: number
  created_at: string
}

export interface Lead {
  id: string
  workspace_id: string
  date: string
  lead_source: string
  lead_name: string
  lead_phone: string
  lead_email: string
  lead_status: string
  lead_value: number
  follow_up_status: string
  assigned_to: string
  notes: string
  created_at: string
}

export interface InventoryItem {
  id: string
  workspace_id: string
  product_name: string
  sku: string
  current_stock: number
  reorder_level: number
  selling_price: number
  cost_price: number
  notes: string
  created_at: string
}

export interface ActionItem {
  id: string
  workspace_id: string
  action: string
  category: string
  priority: 'High' | 'Medium' | 'Low'
  reason: string
  expected_impact: string
  owner: string
  deadline: string
  status: 'Pending' | 'In Progress' | 'Done'
  created_at: string
}

export interface Report {
  id: string
  workspace_id: string
  week_start: string
  week_end: string
  revenue: number
  orders_count: number
  aov: number
  ad_spend: number
  ad_revenue: number
  roas: number
  cod_orders: number
  confirmed_cod_orders: number
  cod_confirmation_rate: number
  cancelled_orders: number
  cancellation_rate: number
  top_product: string
  weak_product: string
  low_stock_products: string
  pending_followups: number
  summary: string
  created_at: string
}

export interface ReportEmailLog {
  id: string
  workspace_id: string
  report_id: string
  email_to: string
  status: 'sent' | 'failed'
  sent_at: string
  error_message: string
}

export interface CsvUpload {
  id: string
  workspace_id: string
  file_name: string
  upload_type: 'orders' | 'ads' | 'leads' | 'inventory'
  row_count: number
  status: 'success' | 'partial' | 'failed'
  error_message: string
  created_at: string
}

export interface AdminNote {
  id: string
  workspace_id: string
  admin_id: string
  note: string
  created_at: string
}

export interface IntegrationConnection {
  id: string
  workspace_id: string
  provider: 'shopify' | 'meta' | 'ga4' | 'whatsapp' | 'stripe'
  status: 'connected' | 'disconnected' | 'error'
  access_token_encrypted: string
  refresh_token_encrypted: string
  shop_domain: string
  ad_account_id: string
  ga4_property_id: string
  last_sync_at: string
  created_at: string
}

export interface IntegrationSyncLog {
  id: string
  workspace_id: string
  provider: string
  sync_type: string
  status: 'success' | 'failed'
  records_synced: number
  error_message: string
  started_at: string
  finished_at: string
}

export interface DashboardMetrics {
  revenue: number
  orders: number
  aov: number
  adSpend: number
  adRevenue: number
  roas: number
  codOrders: number
  confirmedCodOrders: number
  codConfirmationRate: number
  cancelledOrders: number
  cancellationRate: number
  topProduct: string
  weakProduct: string
  lowStockProducts: InventoryItem[]
  pendingFollowups: number
}

export interface ChartDataPoint {
  label: string
  value: number
}
