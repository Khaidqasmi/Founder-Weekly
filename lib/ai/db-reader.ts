import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Scoped, read-only access to the workspace database for the AI assistant.
 * This is the ONLY way the model can reach the database — there is no raw
 * SQL path, no arbitrary table/column access, and no way to escape the
 * current workspace, regardless of what the model asks for.
 *
 * Protections:
 * - Table names are checked against an allow-list; anything else is rejected.
 * - Column lists are hardcoded per table (never taken from model input) and
 *   deliberately exclude PII (customer name/phone/email) and anything
 *   sensitive (encrypted tokens, credentials) — those tables/columns simply
 *   aren't in the allow-list at all.
 * - workspace_id is always injected server-side from the authenticated
 *   session; a model-supplied workspace_id is ignored.
 * - Row count and response size are capped so a single lookup can't be used
 *   to exfiltrate the whole database.
 */

interface TableSpec {
  columns: string
  dateColumn: string | null
  orderBy: string
}

const ALLOWED_TABLES: Record<string, TableSpec> = {
  orders: {
    columns: 'order_date, order_id, product_name, sku, quantity, selling_price, revenue, payment_method, order_status, cod_status, courier_status, return_status',
    dateColumn: 'order_date',
    orderBy: 'order_date',
  },
  ads: {
    columns: 'date, platform, campaign_name, ad_set_name, ad_name, ad_spend, impressions, reach, clicks, purchases, purchase_revenue',
    dateColumn: 'date',
    orderBy: 'date',
  },
  leads: {
    columns: 'date, lead_source, lead_status, lead_value, follow_up_status',
    dateColumn: 'date',
    orderBy: 'date',
  },
  inventory: {
    columns: 'product_name, sku, current_stock, reorder_level, selling_price, cost_price',
    dateColumn: null,
    orderBy: 'current_stock',
  },
  reports: {
    columns: 'week_start, week_end, revenue, orders_count, aov, ad_spend, ad_revenue, roas, cod_orders, confirmed_cod_orders, cod_confirmation_rate, cancelled_orders, cancellation_rate, top_product, weak_product, low_stock_products, pending_followups, summary',
    dateColumn: 'week_start',
    orderBy: 'week_start',
  },
  action_items: {
    columns: 'action, category, priority, reason, expected_impact, deadline, status',
    dateColumn: null,
    orderBy: 'created_at',
  },
  csv_uploads: {
    columns: 'file_name, upload_type, row_count, status, error_message, created_at',
    dateColumn: 'created_at',
    orderBy: 'created_at',
  },
}

export const ALLOWED_TABLE_NAMES = Object.keys(ALLOWED_TABLES)

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const MAX_ROWS = 50
const MAX_RESPONSE_CHARS = 8000

export interface WorkspaceQueryArgs {
  table: string
  from?: string
  to?: string
  limit?: number
}

export interface WorkspaceQueryResult {
  ok: boolean
  table: string
  rowCount?: number
  rows?: unknown[]
  error?: string
}

export async function queryWorkspaceData(
  supabase: SupabaseClient,
  workspaceId: string,
  args: WorkspaceQueryArgs
): Promise<WorkspaceQueryResult> {
  const spec = ALLOWED_TABLES[args.table]
  if (!spec) {
    return { ok: false, table: args.table, error: `Table "${args.table}" is not accessible. Allowed tables: ${ALLOWED_TABLE_NAMES.join(', ')}.` }
  }

  const limit = Math.max(1, Math.min(Number(args.limit) || 20, MAX_ROWS))

  let query = supabase
    .from(args.table)
    .select(spec.columns)
    .eq('workspace_id', workspaceId) // always enforced server-side, never from model input

  if (spec.dateColumn && args.from && DATE_RE.test(args.from)) {
    query = query.gte(spec.dateColumn, args.from)
  }
  if (spec.dateColumn && args.to && DATE_RE.test(args.to)) {
    query = query.lte(spec.dateColumn, args.to)
  }

  query = query.order(spec.orderBy, { ascending: false }).limit(limit)

  const { data, error } = await query

  if (error) {
    return { ok: false, table: args.table, error: 'Query failed.' }
  }

  let rows = data || []
  // Hard cap on serialized size, in case of very wide/long text fields.
  let serialized = JSON.stringify(rows)
  while (serialized.length > MAX_RESPONSE_CHARS && rows.length > 1) {
    rows = rows.slice(0, Math.ceil(rows.length / 2))
    serialized = JSON.stringify(rows)
  }

  return { ok: true, table: args.table, rowCount: rows.length, rows }
}
