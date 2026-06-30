export function getMetaClient(accessToken: string) {
  const baseUrl = 'https://graph.facebook.com/v18.0'

  async function fetchMeta(endpoint: string) {
    const res = await fetch(`${baseUrl}${endpoint}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) throw new Error(`Meta API error: ${res.status}`)
    return res.json()
  }

  return { fetchMeta }
}
