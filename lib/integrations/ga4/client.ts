export function getGA4Client(_clientId: string, _clientSecret: string) {
  throw new Error('GA4 sync requires credentials. Set GA4_CLIENT_ID and GA4_CLIENT_SECRET.')
}
