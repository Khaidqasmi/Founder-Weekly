const requiredServerEnv = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'RESEND_API_KEY',
  'EMAIL_FROM',
  'ADMIN_EMAIL',
  'CRON_SECRET',
] as const

const requiredPublicEnv = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_APP_URL',
] as const

export function validateServerEnv() {
  const missing = requiredServerEnv.filter((key) => !process.env[key])
  if (missing.length > 0) {
    throw new Error(
      `Missing required server environment variables: ${missing.join(', ')}. Check your .env.local file.`
    )
  }
}

export function validatePublicEnv() {
  const missing = requiredPublicEnv.filter((key) => !process.env[key])
  if (missing.length > 0) {
    throw new Error(
      `Missing required public environment variables: ${missing.join(', ')}. Check your .env.local file.`
    )
  }
}

export const config = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  },
  email: {
    apiKey: process.env.RESEND_API_KEY!,
    from: process.env.EMAIL_FROM!,
    adminEmail: process.env.ADMIN_EMAIL!,
  },
  app: {
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  },
  cron: {
    secret: process.env.CRON_SECRET!,
  },
  integrations: {
    shopify: {
      clientId: process.env.SHOPIFY_CLIENT_ID || '',
      clientSecret: process.env.SHOPIFY_CLIENT_SECRET || '',
      isConfigured: !!(process.env.SHOPIFY_CLIENT_ID && process.env.SHOPIFY_CLIENT_SECRET),
    },
    meta: {
      appId: process.env.META_APP_ID || '',
      appSecret: process.env.META_APP_SECRET || '',
      isConfigured: !!(process.env.META_APP_ID && process.env.META_APP_SECRET),
    },
    ga4: {
      clientId: process.env.GA4_CLIENT_ID || '',
      clientSecret: process.env.GA4_CLIENT_SECRET || '',
      isConfigured: !!(process.env.GA4_CLIENT_ID && process.env.GA4_CLIENT_SECRET),
    },
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY || '',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
      isConfigured: !!(process.env.STRIPE_SECRET_KEY),
    },
    whatsapp: {
      accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
      isConfigured: !!(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID),
    },
  },
} as const
