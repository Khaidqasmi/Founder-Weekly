import { courierAccount, courierCredentials } from '@/lib/integrations/couriers/account'
import { postexResponse } from '@/lib/integrations/couriers/postex'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: Request) {
  const account = await courierAccount()
  if (!account) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const credentials = await courierCredentials(account)
  const { resource } = await request.json()
  const response = await postexResponse(credentials.postex_api_token || '', resource)
  response.headers.set('Cache-Control', 'private, no-store')
  return response
}
