'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { KPICard } from '@/components/dashboard/kpi-card'
import { LoadingSpinner } from '@/components/loading'
import { COURIER_PROVIDERS, DELIVERY_STATUSES } from '@/lib/integrations/couriers/types'
import type { Shipment, CourierProvider } from '@/lib/integrations/couriers/types'
import { fetchAllShipments, fetchAllRemittances } from '@/lib/integrations/couriers/client'
import type { Remittance } from '@/lib/integrations/couriers/client'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { toast } from 'sonner'
import { Eye, EyeOff, RefreshCw, Search, Upload, X, ZoomIn, FileText, ExternalLink } from 'lucide-react'

const RECEIPTS_KEY = 'fw-cod-receipts'

interface CodReceipt {
  id: string
  courier: string
  date: string
  amount: number
  notes: string
  imageBase64: string
  uploadedAt: string
}

// Demo shipments so the page works without any API keys
const DEMO_SHIPMENTS: Shipment[] = [
  { id: '1', courier: 'Trax', trackingNumber: 'TRX-20240115001', orderId: 'ORD-1001', customerName: 'Ali Khan', customerPhone: '03001234567', city: 'Karachi', productName: 'Premium T-Shirt x2', amount: 3000, deliveryStatus: 'delivered', statusColor: 'green', bookedAt: '2024-01-15', deliveredAt: '2024-01-18', lastUpdate: '2024-01-18', remarks: 'Delivered' },
  { id: '2', courier: 'Leopards', trackingNumber: 'LP-90001234', orderId: 'ORD-1003', customerName: 'Usman Raza', customerPhone: '03211234567', city: 'Islamabad', productName: 'Premium T-Shirt x3', amount: 4500, deliveryStatus: 'in_transit', statusColor: 'yellow', bookedAt: '2024-01-16', lastUpdate: '2024-01-17', remarks: 'In Transit - Islamabad Hub' },
  { id: '3', courier: 'Call Courier', trackingNumber: 'CC-5550001', orderId: 'ORD-1004', customerName: 'Fatima Noor', customerPhone: '03331234567', city: 'Rawalpindi', productName: 'Jogger Pants', amount: 2800, deliveryStatus: 'out_for_delivery', statusColor: 'yellow', bookedAt: '2024-01-15', lastUpdate: '2024-01-17', remarks: 'Out for Delivery' },
  { id: '4', courier: 'PostEx', trackingNumber: 'PX-88001122', orderId: 'ORD-1005', customerName: 'Hassan Ali', customerPhone: '03451234567', city: 'Faisalabad', productName: 'Cap Minimal x2', amount: 1600, deliveryStatus: 'returned', statusColor: 'red', bookedAt: '2024-01-14', lastUpdate: '2024-01-17', remarks: 'Returned - Customer refused' },
  { id: '5', courier: 'Trax', trackingNumber: 'TRX-20240116002', orderId: 'ORD-1006', customerName: 'Ayesha Malik', customerPhone: '03111234567', city: 'Multan', productName: 'Hoodie Classic', amount: 3500, deliveryStatus: 'delivered', statusColor: 'green', bookedAt: '2024-01-14', deliveredAt: '2024-01-17', lastUpdate: '2024-01-17', remarks: 'Delivered' },
  { id: '6', courier: 'Leopards', trackingNumber: 'LP-90001235', orderId: 'ORD-1007', customerName: 'Zain Ul Abideen', customerPhone: '03001112233', city: 'Karachi', productName: 'Premium T-Shirt', amount: 1500, deliveryStatus: 'booked', statusColor: 'blue', bookedAt: '2024-01-17', lastUpdate: '2024-01-17', remarks: 'Booked' },
  { id: '7', courier: 'Call Courier', trackingNumber: 'CC-5550002', orderId: 'ORD-1008', customerName: 'Maryam Shah', customerPhone: '03221234567', city: 'Lahore', productName: 'Jogger Pants x2', amount: 5600, deliveryStatus: 'in_transit', statusColor: 'yellow', bookedAt: '2024-01-16', lastUpdate: '2024-01-17', remarks: 'In Transit - Lahore Hub' },
  { id: '8', courier: 'Trax', trackingNumber: 'TRX-20240117003', orderId: 'ORD-1009', customerName: 'Bilal Hussain', customerPhone: '03339998877', city: 'Peshawar', productName: 'Cap Minimal x3', amount: 2400, deliveryStatus: 'picked', statusColor: 'blue', bookedAt: '2024-01-17', lastUpdate: '2024-01-17', remarks: 'Picked Up' },
  { id: '9', courier: 'PostEx', trackingNumber: 'PX-88001123', orderId: 'ORD-1010', customerName: 'Nadia Farooq', customerPhone: '03451112233', city: 'Sialkot', productName: 'Premium T-Shirt', amount: 1500, deliveryStatus: 'failed', statusColor: 'red', bookedAt: '2024-01-15', lastUpdate: '2024-01-17', remarks: 'Failed - Address incomplete' },
  { id: '10', courier: 'Leopards', trackingNumber: 'LP-90001236', orderId: 'ORD-1011', customerName: 'Kamran Yousuf', customerPhone: '03001234568', city: 'Quetta', productName: 'Hoodie Classic', amount: 3500, deliveryStatus: 'delivered', statusColor: 'green', bookedAt: '2024-01-13', deliveredAt: '2024-01-16', lastUpdate: '2024-01-16', remarks: 'Delivered' },
]

function CodReceiptsSection({ couriers }: { couriers: string[] }) {
  // API-fetched remittances
  const [remittances, setRemittances] = useState<Remittance[]>([])
  const [fetching, setFetching] = useState(false)
  const [fetchErrors, setFetchErrors] = useState<string[]>([])
  const hasApiKeys = typeof window !== 'undefined' && (
    !!localStorage.getItem('fwgr_trax_api_key') ||
    !!localStorage.getItem('fwgr_leopards_api_key') ||
    !!localStorage.getItem('fwgr_postex_api_token')
  )

  // Manual receipts (fallback for couriers without API support)
  const [receipts, setReceipts] = useState<CodReceipt[]>([])
  const [form, setForm] = useState({ courier: '', date: '', amount: '', notes: '' })
  const [imageBase64, setImageBase64] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [showManual, setShowManual] = useState(false)

  useEffect(() => {
    try { setReceipts(JSON.parse(localStorage.getItem(RECEIPTS_KEY) || '[]')) } catch {}
    loadRemittances()
  }, [])

  async function loadRemittances() {
    setFetching(true)
    try {
      const { remittances: data, errors } = await fetchAllRemittances()
      setRemittances(data)
      setFetchErrors(errors)
    } catch (e: any) {
      setFetchErrors([e.message])
    }
    setFetching(false)
  }

  function saveManual(list: CodReceipt[]) {
    setReceipts(list)
    localStorage.setItem(RECEIPTS_KEY, JSON.stringify(list))
  }

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => { const b64 = reader.result as string; setImageBase64(b64); setPreview(b64) }
    reader.readAsDataURL(file)
  }

  function handleAdd() {
    if (!form.courier || !form.date || !form.amount) { toast.error('Courier, date and amount are required'); return }
    const receipt: CodReceipt = { id: Date.now().toString(), courier: form.courier, date: form.date, amount: parseFloat(form.amount), notes: form.notes, imageBase64, uploadedAt: new Date().toISOString() }
    saveManual([receipt, ...receipts])
    setForm({ courier: '', date: '', amount: '', notes: '' })
    setImageBase64(''); setPreview(null)
    toast.success('Receipt saved')
  }

  const apiTotal = remittances.reduce((s, r) => s + r.amount, 0)
  const manualTotal = receipts.reduce((s, r) => s + r.amount, 0)

  const statusBadge = (status: Remittance['status']) => {
    if (status === 'paid') return <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Paid</span>
    if (status === 'processing') return <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">Processing</span>
    return <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-medium">Pending</span>
  }

  return (
    <div className="mt-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">COD Payment Slips</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {hasApiKeys ? 'Auto-fetched from your connected couriers' : 'Connect a courier on the Integrations page to auto-fetch slips'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {(remittances.length > 0 || receipts.length > 0) && (
            <div className="text-right">
              <p className="text-xs text-gray-500">Total Collected</p>
              <p className="text-lg font-bold text-green-600">PKR {(apiTotal + manualTotal).toLocaleString()}</p>
            </div>
          )}
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={loadRemittances} disabled={fetching}>
            <RefreshCw className={`w-3 h-3 ${fetching ? 'animate-spin' : ''}`} />
            {fetching ? 'Fetching…' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* API Errors */}
      {fetchErrors.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-xs text-amber-800">
          {fetchErrors.map((e, i) => <p key={i}>{e}</p>)}
        </div>
      )}

      {/* Auto-fetched Remittances Table */}
      {remittances.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Remittance Slips from Courier APIs</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Courier</TableHead>
                  <TableHead>Slip #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-center">Shipments</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {remittances.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm font-medium">{r.courier}</TableCell>
                    <TableCell className="text-xs font-mono text-gray-500">{r.remittanceNo}</TableCell>
                    <TableCell className="text-xs text-gray-500">{r.date ? r.date.slice(0, 10) : '—'}</TableCell>
                    <TableCell className="text-right font-bold text-green-600 text-sm">PKR {r.amount.toLocaleString()}</TableCell>
                    <TableCell className="text-center text-xs text-gray-500">{r.shipmentCount || '—'}</TableCell>
                    <TableCell>{statusBadge(r.status)}</TableCell>
                    <TableCell>
                      {r.pdfUrl && (
                        <a href={r.pdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                          <FileText className="w-3 h-3" /> Slip <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* No API keys / no remittances state */}
      {!fetching && remittances.length === 0 && (
        <div className="bg-white dark:bg-gray-900 border border-dashed border-gray-200 rounded-lg p-8 text-center mb-6">
          <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-600">No remittance slips found</p>
          <p className="text-xs text-gray-400 mt-1">
            {hasApiKeys
              ? 'Your connected couriers have no remittances yet, or their API does not support remittance fetching.'
              : 'Connect Trax, Leopards, or PostEx on the Integrations page and slips will appear here automatically.'}
          </p>
        </div>
      )}

      {/* Manual upload toggle */}
      <div className="flex items-center gap-2 mb-3">
        <button onClick={() => setShowManual(!showManual)} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
          <Upload className="w-3 h-3" />
          {showManual ? 'Hide manual upload' : 'Add receipt manually (for couriers without API)'}
        </button>
      </div>

      {showManual && (
        <>
          <Card className="mb-4">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Upload Receipt Manually</CardTitle></CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                <div>
                  <Label className="text-xs mb-1 block">Courier *</Label>
                  <Select value={form.courier} onValueChange={(v) => setForm({ ...form, courier: v ?? '' })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select courier" /></SelectTrigger>
                    <SelectContent>
                      {['Trax', 'Leopards', 'Call Courier', 'PostEx', 'TCS', 'Swyft', 'BlueEx', 'Other'].map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Date *</Label>
                  <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Amount (PKR) *</Label>
                  <Input type="number" placeholder="e.g. 15000" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Notes</Label>
                  <Input placeholder="e.g. Week 3 collection" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="h-8 text-xs" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer border border-dashed border-gray-300 rounded-lg px-4 py-2 text-xs text-gray-500 hover:border-gray-400 transition-colors">
                  <Upload className="w-4 h-4" />
                  {preview ? 'Change Image' : 'Upload Receipt Photo'}
                  <input type="file" accept="image/*" className="hidden" onChange={handleImage} />
                </label>
                {preview && <img src={preview} alt="preview" className="h-12 w-12 object-cover rounded border cursor-pointer" onClick={() => setLightbox(preview)} />}
                <Button size="sm" className="ml-auto h-8 text-xs" onClick={handleAdd}>Save Receipt</Button>
              </div>
            </CardContent>
          </Card>

          {receipts.length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {receipts.map((r) => (
                <div key={r.id} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                  {r.imageBase64 ? (
                    <div className="relative group cursor-pointer" onClick={() => setLightbox(r.imageBase64)}>
                      <img src={r.imageBase64} alt="receipt" className="w-full h-36 object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <ZoomIn className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-36 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <p className="text-xs text-gray-400">No image</p>
                    </div>
                  )}
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">{r.courier}</span>
                      <button onClick={() => saveManual(receipts.filter((x) => x.id !== r.id))} className="text-gray-300 hover:text-red-500 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-base font-bold text-green-600">PKR {r.amount.toLocaleString()}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{r.date}</p>
                    {r.notes && <p className="text-xs text-gray-500 mt-1 truncate">{r.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="receipt" className="max-h-[90vh] max-w-[90vw] rounded-lg shadow-2xl object-contain" />
          <button className="absolute top-4 right-4 text-white" onClick={() => setLightbox(null)}>
            <X className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  )
}

function CourierSetupCard({ provider }: { provider: CourierProvider }) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const stored: Record<string, string> = {}
    let hasSaved = false
    provider.fields.forEach((f) => {
      const val = localStorage.getItem(`fwgr_${f.key}`) || ''
      stored[f.key] = val
      if (val) hasSaved = true
    })
    setValues(stored)
    setSaved(hasSaved)
  }, [provider.fields])

  function handleSave() {
    provider.fields.forEach((f) => {
      const val = values[f.key]?.trim() || ''
      if (val) localStorage.setItem(`fwgr_${f.key}`, val)
      else localStorage.removeItem(`fwgr_${f.key}`)
    })
    setSaved(Object.values(values).some((v) => v.trim()))
    toast.success(`${provider.name} credentials saved`)
  }

  function handleRemove() {
    provider.fields.forEach((f) => localStorage.removeItem(`fwgr_${f.key}`))
    setValues({})
    setSaved(false)
    toast.success(`${provider.name} disconnected`)
  }

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{provider.logo}</span>
          <span className="font-medium text-sm">{provider.name}</span>
        </div>
        {saved ? (
          <Badge className="bg-green-100 text-green-800 text-xs">Connected</Badge>
        ) : (
          <Badge variant="secondary" className="text-xs">Not Set</Badge>
        )}
      </div>
      <div className="space-y-2">
        {provider.fields.map((f) => (
          <div key={f.key} className="flex gap-1">
            <Input
              type={showKeys[f.key] ? 'text' : 'password'}
              value={values[f.key] || ''}
              onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
              placeholder={f.placeholder}
              className="text-xs font-mono h-8"
            />
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setShowKeys((p) => ({ ...p, [f.key]: !p[f.key] }))}>
              {showKeys[f.key] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            </Button>
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-3">
        <Button size="sm" className="h-7 text-xs" onClick={handleSave}>Save</Button>
        {saved && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleRemove}>Remove</Button>}
        <a href={provider.docsUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline ml-auto self-center">Docs</a>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const info = DELIVERY_STATUSES[status] || DELIVERY_STATUSES.unknown
  const colorMap = {
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    red: 'bg-red-100 text-red-800',
    blue: 'bg-blue-100 text-blue-800',
    gray: 'bg-gray-100 text-gray-800',
  }
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorMap[info.color]}`}>{info.label}</span>
}

export default function CouriersPage() {
  const [shipments, setShipments] = useState<Shipment[]>(DEMO_SHIPMENTS)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [isDemo, setIsDemo] = useState(true)
  const [showSetup, setShowSetup] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [courierFilter, setCourierFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')

  async function refreshData() {
    setLoading(true)
    setErrors([])
    try {
      const result = await fetchAllShipments()
      if (result.shipments.length > 0) {
        setShipments(result.shipments)
        setIsDemo(false)
      } else if (result.errors.length > 0) {
        setErrors(result.errors)
      } else {
        setShipments(DEMO_SHIPMENTS)
        setIsDemo(true)
      }
      if (result.errors.length > 0) {
        setErrors(result.errors)
      }
    } catch (err: any) {
      setErrors([err.message])
    }
    setLoading(false)
  }

  useEffect(() => {
    const hasAnyKey = COURIER_PROVIDERS.some((p) =>
      p.fields.some((f) => localStorage.getItem(`fwgr_${f.key}`))
    )
    if (hasAnyKey) refreshData()
  }, [])

  function getDateRange(filter: string): { from: Date | null; to: Date | null } {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    if (filter === 'today') return { from: today, to: now }
    if (filter === 'yesterday') {
      const y = new Date(today); y.setDate(y.getDate() - 1)
      return { from: y, to: today }
    }
    if (filter === '7d') { const f = new Date(today); f.setDate(f.getDate() - 7); return { from: f, to: now } }
    if (filter === '30d') { const f = new Date(today); f.setDate(f.getDate() - 30); return { from: f, to: now } }
    if (filter === '3m') { const f = new Date(today); f.setMonth(f.getMonth() - 3); return { from: f, to: now } }
    if (filter === '6m') { const f = new Date(today); f.setMonth(f.getMonth() - 6); return { from: f, to: now } }
    if (filter === '1y') { const f = new Date(today); f.setFullYear(f.getFullYear() - 1); return { from: f, to: now } }
    return { from: null, to: null }
  }

  const { from: dateFrom, to: dateTo } = getDateRange(dateFilter)

  const filtered = shipments.filter((s) => {
    if (statusFilter !== 'all' && s.deliveryStatus !== statusFilter) return false
    if (courierFilter !== 'all' && s.courier !== courierFilter) return false
    if (dateFrom && dateTo) {
      const booked = new Date(s.bookedAt)
      if (booked < dateFrom || booked > dateTo) return false
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        s.orderId.toLowerCase().includes(q) ||
        s.trackingNumber.toLowerCase().includes(q) ||
        s.customerName.toLowerCase().includes(q) ||
        s.customerPhone.includes(q) ||
        s.city.toLowerCase().includes(q) ||
        s.productName.toLowerCase().includes(q)
      )
    }
    return true
  })

  // KPIs based on date-filtered shipments (status/search filters excluded so totals reflect the date range)
  const dateFiltered = shipments.filter((s) => {
    if (!dateFrom || !dateTo) return true
    const booked = new Date(s.bookedAt)
    return booked >= dateFrom && booked <= dateTo
  })

  const totalShipments = dateFiltered.length
  const delivered = dateFiltered.filter((s) => s.deliveryStatus === 'delivered').length
  const inTransit = dateFiltered.filter((s) => ['in_transit', 'out_for_delivery', 'picked'].includes(s.deliveryStatus)).length
  const returned = dateFiltered.filter((s) => ['returned', 'cancelled', 'failed'].includes(s.deliveryStatus)).length
  const totalCOD = dateFiltered.reduce((sum, s) => sum + s.amount, 0)
  const deliveredCOD = dateFiltered.filter((s) => s.deliveryStatus === 'delivered').reduce((sum, s) => sum + s.amount, 0)
  const deliveryRate = totalShipments > 0 ? ((delivered / totalShipments) * 100).toFixed(1) : '0'
  const returnRate = totalShipments > 0 ? ((returned / totalShipments) * 100).toFixed(1) : '0'

  const uniqueCouriers = [...new Set(dateFiltered.map((s) => s.courier))]

  return (
    <div className="min-h-screen bg-gray-50">
      
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Courier Management</h1>
            <p className="text-sm text-gray-500 mt-0.5">Track all your shipments across couriers in one place</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowSetup(!showSetup)}>
              {showSetup ? 'Hide Setup' : 'Connect Couriers'}
            </Button>
            <Button size="sm" onClick={refreshData} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Syncing...' : 'Refresh'}
            </Button>
          </div>
        </div>

        {/* Demo Banner */}
        {isDemo && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <p className="text-sm font-medium text-amber-900">Viewing demo shipment data</p>
            <p className="text-xs text-amber-700 mt-0.5">Connect your courier accounts below to see real tracking data.</p>
          </div>
        )}

        {/* Errors */}
        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            {errors.map((e, i) => <p key={i} className="text-sm text-red-700">{e}</p>)}
          </div>
        )}

        {/* Courier Setup */}
        {showSetup && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Connect Your Courier Portals</CardTitle>
              <p className="text-xs text-gray-500">API keys are stored in your browser only — never sent to our servers.</p>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {COURIER_PROVIDERS.map((p) => (
                  <CourierSetupCard key={p.id} provider={p} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
          <KPICard title="Total Shipments" value={formatNumber(totalShipments)} />
          <KPICard title="Delivered" value={formatNumber(delivered)} subtitle={`${deliveryRate}%`} />
          <KPICard title="In Transit" value={formatNumber(inTransit)} />
          <KPICard title="Returned/Failed" value={formatNumber(returned)} subtitle={`${returnRate}%`} />
          <KPICard title="Total COD" value={formatCurrency(totalCOD)} />
          <KPICard title="COD Collected" value={formatCurrency(deliveredCOD)} />
          <KPICard title="Couriers" value={formatNumber(uniqueCouriers.length)} />
        </div>

        {/* Date Filter */}
        <div className="flex flex-wrap gap-2 mb-3">
          {[
            { label: 'All Time', value: 'all' },
            { label: 'Today', value: 'today' },
            { label: 'Yesterday', value: 'yesterday' },
            { label: '7 Days', value: '7d' },
            { label: '30 Days', value: '30d' },
            { label: '3 Months', value: '3m' },
            { label: '6 Months', value: '6m' },
            { label: '1 Year', value: '1y' },
          ].map((p) => (
            <button
              key={p.value}
              onClick={() => setDateFilter(p.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                dateFilter === p.value
                  ? 'bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by order ID, tracking #, name, phone, city, product..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v: string | null) => v && setStatusFilter(v)}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.entries(DELIVERY_STATUSES).map(([key, val]) => (
                <SelectItem key={key} value={key}>{val.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={courierFilter} onValueChange={(v) => v && setCourierFilter(v ?? 'all')}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Couriers" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Couriers</SelectItem>
              {uniqueCouriers.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <p className="text-xs text-gray-500 mb-2">{filtered.length} shipment{filtered.length !== 1 ? 's' : ''} found</p>

        {/* Shipments Table */}
        <Card>
          <CardContent className="pt-4 px-0">
            {loading ? (
              <LoadingSpinner />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Courier</TableHead>
                      <TableHead>Tracking #</TableHead>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Booked</TableHead>
                      <TableHead>Last Update</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((s) => (
                      <TableRow key={`${s.courier}-${s.id}`}>
                        <TableCell className="font-medium text-xs">{s.courier}</TableCell>
                        <TableCell className="font-mono text-xs">{s.trackingNumber}</TableCell>
                        <TableCell className="text-xs">{s.orderId}</TableCell>
                        <TableCell className="text-sm">{s.customerName}</TableCell>
                        <TableCell className="text-xs font-mono text-gray-700">{s.customerPhone || '—'}</TableCell>
                        <TableCell className="text-xs">{s.city}</TableCell>
                        <TableCell className="text-xs max-w-[150px] truncate">{s.productName}</TableCell>
                        <TableCell className="text-right font-medium text-sm">{formatCurrency(s.amount)}</TableCell>
                        <TableCell><StatusBadge status={s.deliveryStatus} /></TableCell>
                        <TableCell className="text-xs text-gray-500">{s.bookedAt}</TableCell>
                        <TableCell className="text-xs text-gray-500">{s.lastUpdate}</TableCell>
                      </TableRow>
                    ))}
                    {filtered.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-8 text-gray-400">
                          No shipments match your filters
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* COD Receipts */}
        <CodReceiptsSection couriers={uniqueCouriers} />

      </div>
    </div>
  )
}
