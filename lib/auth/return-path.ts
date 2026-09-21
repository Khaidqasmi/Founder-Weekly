/** Allow only explicit internal destinations; never trust a login `next` URL. */
export function safeReturnPath(value: unknown): string {
  if (value === '/integrations') return value
  if (typeof value === 'string' && /^\/api\/oauth\/shopify\?shop=[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(value)) return value
  return '/dashboard'
}
