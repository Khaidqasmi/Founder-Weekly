export function getStripeClient(_secretKey: string) {
  throw new Error('Stripe integration requires credentials. Set STRIPE_SECRET_KEY.')
}
