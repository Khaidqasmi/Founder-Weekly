export function getShopifyClient(shopDomain: string, accessToken: string) {
  const baseUrl = `https://${shopDomain}/admin/api/2024-01`

  async function fetchShopify(endpoint: string) {
    const res = await fetch(`${baseUrl}${endpoint}`, {
      headers: { 'X-Shopify-Access-Token': accessToken, 'Content-Type': 'application/json' },
    })
    if (!res.ok) throw new Error(`Shopify API error: ${res.status}`)
    return res.json()
  }

  return { fetchShopify }
}
