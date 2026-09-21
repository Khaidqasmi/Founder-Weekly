export const SHOPIFY_API_VERSION = '2026-07'

type GraphQLError = { message?: string }

export async function shopifyAdminGraphQL<T>(
  shopDomain: string,
  accessToken: string,
  query: string,
  variables: Record<string, unknown> = {}
): Promise<T> {
  const response = await fetch(
    `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
    {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    }
  )

  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const detail = body?.errors?.[0]?.message || response.statusText
    throw new Error(`Shopify GraphQL API: ${response.status} ${detail}`)
  }

  const errors = (body?.errors || []) as GraphQLError[]
  if (errors.length > 0) {
    throw new Error(errors.map((error) => error.message || 'Unknown Shopify error').join('; '))
  }

  return body.data as T
}

export async function getShopifyAccessScopes(shopDomain: string, accessToken: string) {
  const data = await shopifyAdminGraphQL<{
    currentAppInstallation: { accessScopes: { handle: string }[] } | null
  }>(
    shopDomain,
    accessToken,
    `query CurrentScopes {
      currentAppInstallation {
        accessScopes { handle }
      }
    }`
  )

  return new Set((data.currentAppInstallation?.accessScopes || []).map((scope) => scope.handle))
}

export async function getShopifyShop(shopDomain: string, accessToken: string) {
  const data = await shopifyAdminGraphQL<{
    shop: { name: string; ianaTimezone: string }
  }>(
    shopDomain,
    accessToken,
    `query ShopIdentity {
      shop { name ianaTimezone }
    }`
  )
  return data.shop
}
