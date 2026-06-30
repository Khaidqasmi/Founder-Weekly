'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { ORDER_STATUSES, COD_STATUSES, PAYMENT_METHODS, AD_PLATFORMS, LEAD_STATUSES } from '@/lib/constants'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

function useWorkspaceId() {
  const [wsId, setWsId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('workspace_members').select('workspace_id').eq('user_id', user.id).single()
          .then(({ data }) => setWsId(data?.workspace_id || null))
      }
    })
  }, [])

  return wsId
}

function OrderForm({ workspaceId }: { workspaceId: string }) {
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const supabase = createClient()
    const { error } = await supabase.from('orders').insert({
      workspace_id: workspaceId,
      order_date: fd.get('order_date'),
      order_id: fd.get('order_id'),
      customer_name: fd.get('customer_name'),
      city: fd.get('city'),
      product_name: fd.get('product_name'),
      sku: fd.get('sku'),
      quantity: Number(fd.get('quantity')) || 0,
      selling_price: Number(fd.get('selling_price')) || 0,
      revenue: (Number(fd.get('quantity')) || 0) * (Number(fd.get('selling_price')) || 0),
      payment_method: fd.get('payment_method'),
      order_status: fd.get('order_status'),
      cod_status: fd.get('cod_status'),
      notes: fd.get('notes'),
    })
    if (error) toast.error(error.message)
    else { toast.success('Order added!'); (e.target as HTMLFormElement).reset() }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Order Date *</Label><Input name="order_date" type="date" required /></div>
        <div><Label>Order ID</Label><Input name="order_id" /></div>
        <div><Label>Customer Name</Label><Input name="customer_name" /></div>
        <div><Label>City</Label><Input name="city" /></div>
        <div><Label>Product Name *</Label><Input name="product_name" required /></div>
        <div><Label>SKU</Label><Input name="sku" /></div>
        <div><Label>Quantity *</Label><Input name="quantity" type="number" min="1" required /></div>
        <div><Label>Selling Price *</Label><Input name="selling_price" type="number" min="0" required /></div>
        <div><Label>Payment Method</Label>
          <Select name="payment_method"><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{PAYMENT_METHODS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>
        </div>
        <div><Label>Order Status</Label>
          <Select name="order_status"><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{ORDER_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
        </div>
        <div><Label>COD Status</Label>
          <Select name="cod_status"><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{COD_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
        </div>
      </div>
      <div><Label>Notes</Label><Textarea name="notes" /></div>
      <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Add Order'}</Button>
    </form>
  )
}

function AdForm({ workspaceId }: { workspaceId: string }) {
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const supabase = createClient()
    const { error } = await supabase.from('ads').insert({
      workspace_id: workspaceId,
      date: fd.get('date'),
      platform: fd.get('platform'),
      campaign_name: fd.get('campaign_name'),
      ad_set_name: fd.get('ad_set_name'),
      ad_name: fd.get('ad_name'),
      ad_spend: Number(fd.get('ad_spend')) || 0,
      impressions: Number(fd.get('impressions')) || 0,
      reach: Number(fd.get('reach')) || 0,
      clicks: Number(fd.get('clicks')) || 0,
      purchases: Number(fd.get('purchases')) || 0,
      purchase_revenue: Number(fd.get('purchase_revenue')) || 0,
    })
    if (error) toast.error(error.message)
    else { toast.success('Ad data added!'); (e.target as HTMLFormElement).reset() }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Date *</Label><Input name="date" type="date" required /></div>
        <div><Label>Platform</Label>
          <Select name="platform"><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{AD_PLATFORMS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>
        </div>
        <div><Label>Campaign Name *</Label><Input name="campaign_name" required /></div>
        <div><Label>Ad Set Name</Label><Input name="ad_set_name" /></div>
        <div><Label>Ad Name</Label><Input name="ad_name" /></div>
        <div><Label>Ad Spend *</Label><Input name="ad_spend" type="number" min="0" required /></div>
        <div><Label>Impressions</Label><Input name="impressions" type="number" min="0" /></div>
        <div><Label>Reach</Label><Input name="reach" type="number" min="0" /></div>
        <div><Label>Clicks</Label><Input name="clicks" type="number" min="0" /></div>
        <div><Label>Purchases</Label><Input name="purchases" type="number" min="0" /></div>
        <div><Label>Purchase Revenue</Label><Input name="purchase_revenue" type="number" min="0" /></div>
      </div>
      <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Add Ad Data'}</Button>
    </form>
  )
}

function LeadForm({ workspaceId }: { workspaceId: string }) {
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const supabase = createClient()
    const { error } = await supabase.from('leads').insert({
      workspace_id: workspaceId,
      date: fd.get('date'),
      lead_source: fd.get('lead_source'),
      lead_name: fd.get('lead_name'),
      lead_phone: fd.get('lead_phone'),
      lead_email: fd.get('lead_email'),
      lead_status: fd.get('lead_status'),
      lead_value: Number(fd.get('lead_value')) || 0,
      follow_up_status: 'Pending',
    })
    if (error) toast.error(error.message)
    else { toast.success('Lead added!'); (e.target as HTMLFormElement).reset() }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Date *</Label><Input name="date" type="date" required /></div>
        <div><Label>Source</Label><Input name="lead_source" /></div>
        <div><Label>Name *</Label><Input name="lead_name" required /></div>
        <div><Label>Phone</Label><Input name="lead_phone" /></div>
        <div><Label>Email</Label><Input name="lead_email" type="email" /></div>
        <div><Label>Status</Label>
          <Select name="lead_status"><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{LEAD_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
        </div>
        <div><Label>Lead Value</Label><Input name="lead_value" type="number" min="0" /></div>
      </div>
      <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Add Lead'}</Button>
    </form>
  )
}

function InventoryForm({ workspaceId }: { workspaceId: string }) {
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const supabase = createClient()
    const { error } = await supabase.from('inventory').insert({
      workspace_id: workspaceId,
      product_name: fd.get('product_name'),
      sku: fd.get('sku'),
      current_stock: Number(fd.get('current_stock')) || 0,
      reorder_level: Number(fd.get('reorder_level')) || 0,
      selling_price: Number(fd.get('selling_price')) || 0,
      cost_price: Number(fd.get('cost_price')) || 0,
      notes: fd.get('notes'),
    })
    if (error) toast.error(error.message)
    else { toast.success('Inventory added!'); (e.target as HTMLFormElement).reset() }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Product Name *</Label><Input name="product_name" required /></div>
        <div><Label>SKU</Label><Input name="sku" /></div>
        <div><Label>Current Stock *</Label><Input name="current_stock" type="number" min="0" required /></div>
        <div><Label>Reorder Level *</Label><Input name="reorder_level" type="number" min="0" required /></div>
        <div><Label>Selling Price</Label><Input name="selling_price" type="number" min="0" /></div>
        <div><Label>Cost Price</Label><Input name="cost_price" type="number" min="0" /></div>
      </div>
      <div><Label>Notes</Label><Textarea name="notes" /></div>
      <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Add Item'}</Button>
    </form>
  )
}

function ActionForm({ workspaceId }: { workspaceId: string }) {
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const supabase = createClient()
    const { error } = await supabase.from('action_items').insert({
      workspace_id: workspaceId,
      action: fd.get('action'),
      category: fd.get('category'),
      priority: fd.get('priority'),
      reason: fd.get('reason'),
      expected_impact: fd.get('expected_impact'),
      owner: fd.get('owner'),
      deadline: fd.get('deadline') || null,
      status: 'Pending',
    })
    if (error) toast.error(error.message)
    else { toast.success('Action added!'); (e.target as HTMLFormElement).reset() }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2"><Label>Action *</Label><Input name="action" required /></div>
        <div><Label>Category</Label><Input name="category" placeholder="e.g., Marketing, Sales, Inventory" /></div>
        <div><Label>Priority</Label>
          <Select name="priority"><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
            </SelectContent></Select>
        </div>
        <div><Label>Reason</Label><Input name="reason" /></div>
        <div><Label>Expected Impact</Label><Input name="expected_impact" /></div>
        <div><Label>Owner</Label><Input name="owner" /></div>
        <div><Label>Deadline</Label><Input name="deadline" type="date" /></div>
      </div>
      <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Add Action'}</Button>
    </form>
  )
}

export default function DataEntryPage() {
  const workspaceId = useWorkspaceId()

  return (
    <div className="min-h-screen bg-gray-50">
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Manual Data Entry</h1>
        {!workspaceId ? (
          <p className="text-gray-500">Loading...</p>
        ) : (
          <Tabs defaultValue="order">
            <TabsList className="mb-6">
              <TabsTrigger value="order">Order</TabsTrigger>
              <TabsTrigger value="ad">Ad</TabsTrigger>
              <TabsTrigger value="lead">Lead</TabsTrigger>
              <TabsTrigger value="inventory">Inventory</TabsTrigger>
              <TabsTrigger value="action">Action</TabsTrigger>
            </TabsList>
            <Card>
              <CardContent className="pt-6">
                <TabsContent value="order"><OrderForm workspaceId={workspaceId} /></TabsContent>
                <TabsContent value="ad"><AdForm workspaceId={workspaceId} /></TabsContent>
                <TabsContent value="lead"><LeadForm workspaceId={workspaceId} /></TabsContent>
                <TabsContent value="inventory"><InventoryForm workspaceId={workspaceId} /></TabsContent>
                <TabsContent value="action"><ActionForm workspaceId={workspaceId} /></TabsContent>
              </CardContent>
            </Card>
          </Tabs>
        )}
      </div>
    </div>
  )
}
