import { NextRequest, NextResponse } from 'next/server'
import { courierAccount, courierCredentials } from '@/lib/integrations/couriers/account'
import { createCourierClient } from '@/lib/integrations/couriers/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  const headers = { 'Cache-Control': 'private, no-store' }
  try {
    const account = await courierAccount()
    if (!account) return NextResponse.json({ error: 'Sign in to Ecom Panel first' }, { status: 401, headers })
    const client = createCourierClient(await courierCredentials(account))
    const result = request.nextUrl.searchParams.get('resource') === 'remittances'
      ? await client.fetchAllRemittances() : await client.fetchAllShipments()
    return NextResponse.json(result, { headers })
  } catch {
    return NextResponse.json({ error: 'Courier data could not be loaded. Please try again.' }, { status: 500, headers })
  }
}
