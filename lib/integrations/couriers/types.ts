export interface CourierProvider {
  id: string
  name: string
  logo: string
  fields: { key: string; label: string; placeholder: string }[]
  docsUrl: string
  trackingUrlTemplate?: string
}

export interface Shipment {
  id: string
  courier: string
  trackingNumber: string
  orderId: string
  customerName: string
  customerPhone: string
  city: string
  productName: string
  amount: number
  weight?: number
  deliveryStatus: string
  statusColor: 'green' | 'yellow' | 'red' | 'blue' | 'gray'
  bookedAt: string
  deliveredAt?: string
  lastUpdate: string
  remarks?: string
}

export const DELIVERY_STATUSES: Record<string, { label: string; color: 'green' | 'yellow' | 'red' | 'blue' | 'gray' }> = {
  booked: { label: 'Booked', color: 'blue' },
  picked: { label: 'Picked Up', color: 'blue' },
  in_transit: { label: 'In Transit', color: 'yellow' },
  out_for_delivery: { label: 'Out for Delivery', color: 'yellow' },
  delivered: { label: 'Delivered', color: 'green' },
  returned: { label: 'Returned', color: 'red' },
  cancelled: { label: 'Cancelled', color: 'red' },
  failed: { label: 'Failed Attempt', color: 'red' },
  on_hold: { label: 'On Hold', color: 'gray' },
  unknown: { label: 'Unknown', color: 'gray' },
}

export const COURIER_PROVIDERS: CourierProvider[] = [
  {
    id: 'trax',
    name: 'Trax (formerly TCS Courier)',
    logo: '📦',
    fields: [
      { key: 'trax_api_key', label: 'API Key', placeholder: 'Your Trax API key' },
    ],
    docsUrl: 'https://developer.trax.pk',
  },
  {
    id: 'leopards',
    name: 'Leopards Courier',
    logo: '🐆',
    fields: [
      { key: 'leopards_api_key', label: 'API Key', placeholder: 'Your Leopards API key' },
      { key: 'leopards_api_password', label: 'API Password', placeholder: 'Your API password' },
    ],
    docsUrl: 'https://leopardscod.com/api-documentation',
  },
  {
    id: 'callcourier',
    name: 'Call Courier',
    logo: '📞',
    fields: [
      { key: 'callcourier_login_id', label: 'Login ID', placeholder: 'Your Call Courier login ID' },
      { key: 'callcourier_password', label: 'Password', placeholder: 'Your password' },
    ],
    docsUrl: 'https://callcourier.com.pk',
  },
  {
    id: 'postex',
    name: 'PostEx',
    logo: '📮',
    fields: [
      { key: 'postex_api_token', label: 'API Token', placeholder: 'Your PostEx token' },
    ],
    docsUrl: 'https://postex.pk',
  },
  {
    id: 'rider',
    name: 'Rider',
    logo: '🏍️',
    fields: [
      { key: 'rider_api_key', label: 'API Key', placeholder: 'Your Rider API key' },
    ],
    docsUrl: 'https://rider.pk',
  },
  {
    id: 'swyft',
    name: 'Swyft Logistics',
    logo: '🚀',
    fields: [
      { key: 'swyft_api_key', label: 'API Key', placeholder: 'Your Swyft API key' },
    ],
    docsUrl: 'https://swyftlogistics.com',
  },
  {
    id: 'mnp',
    name: 'M&P (Muller & Phipps)',
    logo: '🚚',
    fields: [
      { key: 'mnp_username', label: 'Username', placeholder: 'Your M&P username' },
      { key: 'mnp_password', label: 'Password', placeholder: 'Your password' },
    ],
    docsUrl: 'https://mnpcourier.com',
  },
  {
    id: 'dhl',
    name: 'DHL Express',
    logo: '✈️',
    fields: [
      { key: 'dhl_api_key', label: 'API Key', placeholder: 'Your DHL API key' },
      { key: 'dhl_api_secret', label: 'API Secret', placeholder: 'Your DHL API secret' },
    ],
    docsUrl: 'https://developer.dhl.com',
  },
]
