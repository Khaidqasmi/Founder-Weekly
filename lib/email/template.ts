import type { Report } from '@/lib/types'

export function buildReportEmail(report: Report, businessName: string, appUrl: string): string {
  const f = (n: number) => n.toLocaleString()
  const pct = (n: number) => `${n.toFixed(1)}%`

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:0;background:#f9fafb">
<div style="max-width:600px;margin:0 auto;padding:24px">
  <div style="background:#fff;border-radius:12px;padding:32px;border:1px solid #e5e7eb">
    <h1 style="font-size:20px;margin:0 0 4px">${businessName}</h1>
    <p style="color:#6b7280;margin:0 0 24px;font-size:14px">Weekly Growth Report: ${report.week_start} to ${report.week_end}</p>

    <h2 style="font-size:16px;border-bottom:1px solid #e5e7eb;padding-bottom:8px">Business Snapshot</h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
      <tr><td style="padding:6px 0;color:#6b7280">Revenue</td><td style="padding:6px 0;text-align:right;font-weight:600">Rs ${f(report.revenue)}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">Orders</td><td style="padding:6px 0;text-align:right;font-weight:600">${report.orders_count}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">AOV</td><td style="padding:6px 0;text-align:right;font-weight:600">Rs ${f(report.aov)}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">Ad Spend</td><td style="padding:6px 0;text-align:right;font-weight:600">Rs ${f(report.ad_spend)}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">ROAS</td><td style="padding:6px 0;text-align:right;font-weight:600">${report.roas.toFixed(2)}x</td></tr>
    </table>

    <h2 style="font-size:16px;border-bottom:1px solid #e5e7eb;padding-bottom:8px">Product Snapshot</h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
      <tr><td style="padding:6px 0;color:#6b7280">Top Product</td><td style="padding:6px 0;text-align:right;font-weight:600">${report.top_product}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">Weak Product</td><td style="padding:6px 0;text-align:right;font-weight:600">${report.weak_product}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">Low Stock</td><td style="padding:6px 0;text-align:right;font-weight:600">${report.low_stock_products || 'None'}</td></tr>
    </table>

    <h2 style="font-size:16px;border-bottom:1px solid #e5e7eb;padding-bottom:8px">Operations Snapshot</h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
      <tr><td style="padding:6px 0;color:#6b7280">COD Orders</td><td style="padding:6px 0;text-align:right;font-weight:600">${report.cod_orders}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">COD Confirmation Rate</td><td style="padding:6px 0;text-align:right;font-weight:600">${pct(report.cod_confirmation_rate)}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">Cancelled Orders</td><td style="padding:6px 0;text-align:right;font-weight:600">${report.cancelled_orders}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">Cancellation Rate</td><td style="padding:6px 0;text-align:right;font-weight:600">${pct(report.cancellation_rate)}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">Pending Follow-ups</td><td style="padding:6px 0;text-align:right;font-weight:600">${report.pending_followups}</td></tr>
    </table>

    <div style="text-align:center;margin-top:24px">
      <a href="${appUrl}/dashboard" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Open Dashboard</a>
    </div>
  </div>
  <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:16px">Founder Weekly Growth Report</p>
</div>
</body>
</html>`
}
