'use client'

import { demoOrders, demoAds, demoLeads, demoInventory, demoActions } from '@/lib/demo-data'
import {
  calculateRevenue, calculateOrders, calculateAOV, calculateAdSpend, calculateROAS,
  calculateCODConfirmationRate, calculateCancellationRate, calculateTopProduct,
  calculateWeakProduct, calculateLowStockProducts, calculatePendingFollowups,
  getRevenueByDay, getOrdersByDay, getProductPerformance, getAdSpendByCampaign,
  getROASByCampaign, getCODStatusBreakdown,
} from '@/lib/calculations'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils'
import { KPICard } from '@/components/dashboard/kpi-card'
import { SimpleBarChart } from '@/components/charts/bar-chart'
import { SimplePieChart } from '@/components/charts/pie-chart'
import { LinkButton } from '@/components/link-button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

export default function DemoPage() {
  const revenue = calculateRevenue(demoOrders)
  const orders = calculateOrders(demoOrders)
  const aov = calculateAOV(demoOrders)
  const adSpend = calculateAdSpend(demoAds)
  const roas = calculateROAS(demoAds)
  const codRate = calculateCODConfirmationRate(demoOrders)
  const cancelRate = calculateCancellationRate(demoOrders)
  const topProduct = calculateTopProduct(demoOrders)
  const weakProduct = calculateWeakProduct(demoOrders)
  const lowStock = calculateLowStockProducts(demoInventory)
  const pendingFollowups = calculatePendingFollowups(demoLeads)
  const productPerf = getProductPerformance(demoOrders)

  return (
    <div className="min-h-screen bg-zinc-950">
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Demo Dashboard</h1>
            <p className="text-sm text-zinc-400 mt-1">Sample ecommerce data — this is what your dashboard will look like</p>
          </div>
          <LinkButton href="/signup" size="lg">Start Free Trial With My Data</LinkButton>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <KPICard title="Revenue" value={formatCurrency(revenue)} />
          <KPICard title="Orders" value={formatNumber(orders)} />
          <KPICard title="AOV" value={formatCurrency(aov)} />
          <KPICard title="Ad Spend" value={formatCurrency(adSpend)} />
          <KPICard title="ROAS" value={`${roas.toFixed(2)}x`} />
          <KPICard title="COD Confirmation" value={formatPercent(codRate)} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
          <KPICard title="Cancellation Rate" value={formatPercent(cancelRate)} />
          <KPICard title="Top Product" value={topProduct} />
          <KPICard title="Weak Product" value={weakProduct} />
          <KPICard title="Low Stock Items" value={formatNumber(lowStock.length)} />
          <KPICard title="Pending Follow Ups" value={formatNumber(pendingFollowups)} />
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-zinc-900 rounded-lg p-4 shadow-sm">
            <SimpleBarChart data={getRevenueByDay(demoOrders)} title="Revenue by Day" />
          </div>
          <div className="bg-zinc-900 rounded-lg p-4 shadow-sm">
            <SimpleBarChart data={getOrdersByDay(demoOrders)} title="Orders by Day" color="#fbbf24" />
          </div>
          <div className="bg-zinc-900 rounded-lg p-4 shadow-sm">
            <SimpleBarChart data={getAdSpendByCampaign(demoAds)} title="Ad Spend by Campaign" color="#f59e0b" />
          </div>
          <div className="bg-zinc-900 rounded-lg p-4 shadow-sm">
            <SimpleBarChart data={getROASByCampaign(demoAds)} title="ROAS by Campaign" color="#d97706" />
          </div>
          <div className="bg-zinc-900 rounded-lg p-4 shadow-sm">
            <SimpleBarChart
              data={productPerf.map((p) => ({ label: p.name, value: p.revenue }))}
              title="Top Products by Revenue"
            />
          </div>
          <div className="bg-zinc-900 rounded-lg p-4 shadow-sm">
            <SimplePieChart data={getCODStatusBreakdown(demoOrders)} title="COD Status Breakdown" />
          </div>
        </div>

        {/* Tables */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-zinc-900 rounded-lg p-4 shadow-sm">
            <h3 className="text-sm font-medium text-zinc-300 mb-4">Top Products</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productPerf.slice(0, 5).map((p) => (
                  <TableRow key={p.name}>
                    <TableCell>{p.name}</TableCell>
                    <TableCell className="text-right">{formatCurrency(p.revenue)}</TableCell>
                    <TableCell className="text-right">{p.quantity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="bg-zinc-900 rounded-lg p-4 shadow-sm">
            <h3 className="text-sm font-medium text-zinc-300 mb-4">Low Stock Products</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Reorder Level</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStock.map((p) => (
                  <TableRow key={p.sku}>
                    <TableCell>{p.product_name}</TableCell>
                    <TableCell className="text-right text-red-400 font-medium">{p.current_stock}</TableCell>
                    <TableCell className="text-right">{p.reorder_level}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-zinc-900 rounded-lg p-4 shadow-sm mb-8">
          <h3 className="text-sm font-medium text-zinc-300 mb-4">Next 5 Actions</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {demoActions.slice(0, 5).map((a, i) => (
                <TableRow key={i}>
                  <TableCell>{a.action}</TableCell>
                  <TableCell>{a.category}</TableCell>
                  <TableCell>
                    <Badge variant={a.priority === 'High' ? 'destructive' : a.priority === 'Medium' ? 'secondary' : 'outline'}>
                      {a.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>{a.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* CTA */}
        <div className="text-center py-12 bg-zinc-900 rounded-lg shadow-sm">
          <h2 className="text-xl font-bold text-white">Like what you see?</h2>
          <p className="text-zinc-400 mt-2">Start your free trial and see your own business data here.</p>
          <div className="mt-6">
            <LinkButton href="/signup" size="lg">Start Free Trial With My Business Data</LinkButton>
          </div>
        </div>
      </div>
    </div>
  )
}
