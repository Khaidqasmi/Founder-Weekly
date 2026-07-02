import type { Shipment } from './types'

export interface Remittance {
  id: string
  courier: string
  remittanceNo: string
  date: string
  amount: number
  shipmentCount: number
  status: 'paid' | 'pending' | 'processing'
  pdfUrl?: string
}

function getStoredKey(key: string): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(`fwgr_${key}`) || ''
}

function normalizeStatus(raw: string): string {
  const s = raw.toLowerCase().trim()
  if (['delivered', 'completed', 'dlvd'].some((k) => s.includes(k))) return 'delivered'
  if (['return', 'rto', 'rts'].some((k) => s.includes(k))) return 'returned'
  if (['cancel'].some((k) => s.includes(k))) return 'cancelled'
  if (['out for delivery', 'ofd', 'dispatched to consignee'].some((k) => s.includes(k))) return 'out_for_delivery'
  if (['transit', 'hub', 'received at', 'forwarded', 'enroute'].some((k) => s.includes(k))) return 'in_transit'
  if (['pick', 'collected'].some((k) => s.includes(k))) return 'picked'
  if (['book', 'created', 'registered'].some((k) => s.includes(k))) return 'booked'
  if (['fail', 'attempt', 'undelivered'].some((k) => s.includes(k))) return 'failed'
  if (['hold', 'pending'].some((k) => s.includes(k))) return 'on_hold'
  return 'unknown'
}

function statusColor(status: string): 'green' | 'yellow' | 'red' | 'blue' | 'gray' {
  const map: Record<string, 'green' | 'yellow' | 'red' | 'blue' | 'gray'> = {
    delivered: 'green', returned: 'red', cancelled: 'red', failed: 'red',
    out_for_delivery: 'yellow', in_transit: 'yellow',
    booked: 'blue', picked: 'blue',
    on_hold: 'gray', unknown: 'gray',
  }
  return map[status] || 'gray'
}

function firstArray(...values: any[]) {
  for (const value of values) {
    if (Array.isArray(value)) return value
    if (value && typeof value === 'object') {
      const nested = Object.values(value).find(Array.isArray)
      if (Array.isArray(nested)) return nested
    }
  }
  return []
}

function firstString(...values: any[]) {
  return values.find((value) => typeof value === 'string' && value.trim()) || ''
}

async function postexProxy(resource: 'shipments' | 'remittances', token: string) {
  const res = await fetch('/api/couriers/postex', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resource, token }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `PostEx ${resource} error: ${res.status}`)
  return data
}

export async function fetchTraxShipments(): Promise<Shipment[]> {
  const apiKey = getStoredKey('trax_api_key')
  if (!apiKey) throw new Error('Trax API key not configured')

  const res = await fetch('https://sonic.pk/api/shipment/all?status=all', {
    headers: { Authorization: apiKey, 'Content-Type': 'application/json' },
  })

  if (!res.ok) throw new Error(`Trax API error: ${res.status}`)
  const data = await res.json()

  return (data.data || []).map((s: any) => ({
    id: s._id || s.tracking_number,
    courier: 'Trax',
    trackingNumber: s.tracking_number || '',
    orderId: s.order_id || s.reference_number || '',
    customerName: s.consignee_name || '',
    customerPhone: s.consignee_phone || '',
    city: s.consignee_city || '',
    productName: s.item_description || s.items?.[0]?.description || '',
    amount: s.cod_amount || s.total_amount || 0,
    weight: s.weight || 0,
    deliveryStatus: normalizeStatus(s.status || ''),
    statusColor: statusColor(normalizeStatus(s.status || '')),
    bookedAt: s.created_at || '',
    deliveredAt: s.delivery_date || undefined,
    lastUpdate: s.updated_at || s.created_at || '',
    remarks: s.status || '',
  }))
}

export async function fetchLeopardsShipments(): Promise<Shipment[]> {
  const apiKey = getStoredKey('leopards_api_key')
  const apiPassword = getStoredKey('leopards_api_password')
  if (!apiKey) throw new Error('Leopards API key not configured')

  const res = await fetch('https://leopardscod.com/webApi/getShipmentList/format/json/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `api_key=${apiKey}&api_password=${apiPassword}&shipment_status=all`,
  })

  if (!res.ok) throw new Error(`Leopards API error: ${res.status}`)
  const data = await res.json()

  return (data.data || []).map((s: any) => ({
    id: s.track_number || s.cn_number,
    courier: 'Leopards',
    trackingNumber: s.track_number || s.cn_number || '',
    orderId: s.order_id || s.booked_packet_order_id || '',
    customerName: s.consignee_name || '',
    customerPhone: s.consignee_phone || '',
    city: s.destination_city || '',
    productName: s.packet_description || '',
    amount: Number(s.cod_amount) || 0,
    weight: Number(s.weight) || 0,
    deliveryStatus: normalizeStatus(s.status || s.booked_packet_status || ''),
    statusColor: statusColor(normalizeStatus(s.status || s.booked_packet_status || '')),
    bookedAt: s.booking_date || '',
    deliveredAt: s.delivery_date || undefined,
    lastUpdate: s.last_status_update || s.booking_date || '',
    remarks: s.status || s.booked_packet_status || '',
  }))
}

export async function fetchCallCourierShipments(): Promise<Shipment[]> {
  const loginId = getStoredKey('callcourier_login_id')
  const password = getStoredKey('callcourier_password')
  if (!loginId) throw new Error('Call Courier login ID not configured')

  const res = await fetch(`https://cod.callcourier.com.pk/api/CallCourier/GetShipmentList?loginId=${loginId}&password=${password}`)

  if (!res.ok) throw new Error(`Call Courier API error: ${res.status}`)
  const data = await res.json()

  return (data || []).map((s: any) => ({
    id: s.ShipperRefNo || s.CNNo,
    courier: 'Call Courier',
    trackingNumber: s.CNNo || '',
    orderId: s.ShipperRefNo || '',
    customerName: s.ConsigneeName || '',
    customerPhone: s.ConsigneePhone || '',
    city: s.DestCity || '',
    productName: s.ProductDescription || '',
    amount: Number(s.CODAmount) || 0,
    deliveryStatus: normalizeStatus(s.Status || ''),
    statusColor: statusColor(normalizeStatus(s.Status || '')),
    bookedAt: s.BookingDate || '',
    deliveredAt: s.DeliveryDate || undefined,
    lastUpdate: s.StatusDate || s.BookingDate || '',
    remarks: s.Status || '',
  }))
}

export async function fetchPostExShipments(): Promise<Shipment[]> {
  const token = getStoredKey('postex_api_token')
  if (!token) throw new Error('PostEx API token not configured')

  const data = await postexProxy('shipments', token)
  const rows = firstArray(data.dist, data.data, data.orders, data.shipments, data)

  return rows.map((s: any) => ({
    id: firstString(s.trackingNumber, s.tracking_number, s.cn, s.orderRefNumber, s.orderReferenceNumber, s.id),
    courier: 'PostEx',
    trackingNumber: firstString(s.trackingNumber, s.tracking_number, s.cn),
    orderId: firstString(s.orderRefNumber, s.orderReferenceNumber, s.order_id, s.invoiceReference),
    customerName: firstString(s.customerName, s.consigneeName, s.name),
    customerPhone: firstString(s.customerPhone, s.consigneePhone, s.phone),
    city: firstString(s.deliveryAddress?.cityName, s.cityName, s.city, s.destinationCity),
    productName: firstString(s.orderDetail, s.productName, s.itemDescription, s.items),
    amount: Number(s.orderAmount || s.invoicePayment || s.codAmount || s.amount) || 0,
    deliveryStatus: normalizeStatus(firstString(s.orderStatus, s.transactionStatus, s.status)),
    statusColor: statusColor(normalizeStatus(firstString(s.orderStatus, s.transactionStatus, s.status))),
    bookedAt: firstString(s.createdAt, s.orderDate, s.bookingDate, s.bookedAt),
    deliveredAt: firstString(s.deliveredAt, s.deliveryDate) || undefined,
    lastUpdate: firstString(s.updatedAt, s.statusDate, s.createdAt, s.orderDate),
    remarks: firstString(s.orderStatus, s.transactionStatus, s.status, s.statusMessage),
  }))
}

export async function fetchAllShipments(): Promise<{ shipments: Shipment[]; errors: string[] }> {
  const allShipments: Shipment[] = []
  const errors: string[] = []

  const fetchers: { name: string; fn: () => Promise<Shipment[]>; keyCheck: string }[] = [
    { name: 'Trax', fn: fetchTraxShipments, keyCheck: 'trax_api_key' },
    { name: 'Leopards', fn: fetchLeopardsShipments, keyCheck: 'leopards_api_key' },
    { name: 'Call Courier', fn: fetchCallCourierShipments, keyCheck: 'callcourier_login_id' },
    { name: 'PostEx', fn: fetchPostExShipments, keyCheck: 'postex_api_token' },
  ]

  for (const f of fetchers) {
    if (!getStoredKey(f.keyCheck)) continue
    try {
      const shipments = await f.fn()
      allShipments.push(...shipments)
    } catch (err: any) {
      errors.push(`${f.name}: ${err.message}`)
    }
  }

  allShipments.sort((a, b) => new Date(b.lastUpdate).getTime() - new Date(a.lastUpdate).getTime())
  return { shipments: allShipments, errors }
}

// ─── Remittance / Payment Slip Fetchers ───────────────────────────────────────

export async function fetchLeopardsRemittances(): Promise<Remittance[]> {
  const apiKey = getStoredKey('leopards_api_key')
  const apiPassword = getStoredKey('leopards_api_password')
  if (!apiKey) throw new Error('Leopards API key not configured')

  const res = await fetch('https://leopardscod.com/webApi/getRemittanceList/format/json/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `api_key=${apiKey}&api_password=${apiPassword}`,
  })
  if (!res.ok) throw new Error(`Leopards remittance error: ${res.status}`)
  const data = await res.json()

  return (data.data || []).map((r: any) => ({
    id: r.remittance_id || r.id,
    courier: 'Leopards',
    remittanceNo: r.remittance_id || r.id || '',
    date: r.remittance_date || r.date || '',
    amount: Number(r.cod_amount || r.amount) || 0,
    shipmentCount: Number(r.no_of_packets || r.shipments) || 0,
    status: r.status?.toLowerCase().includes('paid') ? 'paid' : 'pending',
    pdfUrl: r.slip_url || undefined,
  }))
}

export async function fetchPostExRemittances(): Promise<Remittance[]> {
  const token = getStoredKey('postex_api_token')
  if (!token) throw new Error('PostEx API token not configured')

  const data = await postexProxy('remittances', token)
  const rows = firstArray(data.dist, data.data, data.remittances, data)

  return rows.map((r: any) => ({
    id: firstString(r.remittanceRefNumber, r.remittanceNo, r.id, r.cprNumber_1, r.cprNumber),
    courier: 'PostEx',
    remittanceNo: firstString(r.remittanceRefNumber, r.remittanceNo, r.id, r.cprNumber_1, r.cprNumber),
    date: firstString(r.remittanceDate, r.settlementDate, r.upfrontPaymentDate, r.createdAt),
    amount: Number(r.remittanceAmount || r.amount || r.invoicePayment || r.codAmount) || 0,
    shipmentCount: Number(r.orderCount || r.shipments || r.shipmentCount) || 0,
    status: firstString(r.status, r.paymentStatus).toLowerCase().includes('paid') || r.settle === true ? 'paid' : 'pending',
    pdfUrl: firstString(r.slipUrl, r.pdfUrl, r.url) || undefined,
  }))
}

export async function fetchTraxRemittances(): Promise<Remittance[]> {
  const apiKey = getStoredKey('trax_api_key')
  if (!apiKey) throw new Error('Trax API key not configured')

  const res = await fetch('https://sonic.pk/api/cod/remittances', {
    headers: { Authorization: apiKey, 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error(`Trax remittance error: ${res.status}`)
  const data = await res.json()

  return (data.data || []).map((r: any) => ({
    id: r._id || r.id,
    courier: 'Trax',
    remittanceNo: r.remittance_number || r._id || '',
    date: r.payment_date || r.created_at || '',
    amount: Number(r.amount) || 0,
    shipmentCount: Number(r.shipment_count) || 0,
    status: r.status === 'completed' ? 'paid' : 'pending',
    pdfUrl: r.slip_url || undefined,
  }))
}

export async function fetchAllRemittances(): Promise<{ remittances: Remittance[]; errors: string[] }> {
  const all: Remittance[] = []
  const errors: string[] = []

  const fetchers = [
    { name: 'Leopards', fn: fetchLeopardsRemittances, key: 'leopards_api_key' },
    { name: 'PostEx', fn: fetchPostExRemittances, key: 'postex_api_token' },
    { name: 'Trax', fn: fetchTraxRemittances, key: 'trax_api_key' },
  ]

  for (const f of fetchers) {
    if (!getStoredKey(f.key)) continue
    try {
      all.push(...(await f.fn()))
    } catch (err: any) {
      errors.push(`${f.name}: ${err.message}`)
    }
  }

  all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  return { remittances: all, errors }
}
