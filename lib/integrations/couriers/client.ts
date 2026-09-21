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


async function courierRequest(path: string, init?: RequestInit) {
  const response = await fetch(path, { ...init, cache: 'no-store' })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Courier request failed')
  return data
}

export async function getCourierConnections(): Promise<string[]> {
  const data = await courierRequest('/api/couriers/connections')
  return data.providers || []
}

export async function saveCourierConnection(provider: string, credentials: Record<string, string>) {
  await courierRequest('/api/couriers/connections', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, credentials }),
  })
}

export async function removeCourierConnection(provider: string) {
  await courierRequest('/api/couriers/connections', {
    method: 'DELETE', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider }),
  })
}

export async function fetchAllShipments(): Promise<{ shipments: Shipment[]; errors: string[] }> {
  return courierRequest('/api/couriers/data?resource=shipments')
}

export async function fetchAllRemittances(): Promise<{ remittances: Remittance[]; errors: string[] }> {
  return courierRequest('/api/couriers/data?resource=remittances')
}
