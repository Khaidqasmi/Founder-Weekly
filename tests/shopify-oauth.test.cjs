const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const crypto = require('node:crypto')

function harness(options = {}) {
  const saved = []
  let calls = 0
  const db = {
    auth: { getUser: async () => ({ data: { user: options.signedOut ? null : { id: 'alice' } } }) },
    from(table) {
      const q = {
        select() { return q }, eq() { return q },
        maybeSingle: async () => ({ data: null, error: null }),
        upsert(record) { saved.push(record); return q },
        single: async () => table === 'workspace_members'
          ? { data: { workspace_id: 'alice-workspace' } }
          : { data: options.saveFails ? null : { id: 'connection-1' }, error: options.saveFails ? { message: 'database unavailable' } : null },
      }
      return q
    },
  }
  function load(file) {
    const module = { exports: {} }
    const js = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText
    const req = name => {
      if (name === 'next/server') return { NextResponse: { redirect(url) {
        const response = Response.redirect(url, 307)
        response.cookies = { set() {}, delete() {} }
        return response
      } } }
      if (name === '@/lib/supabase/server') return { createServerSupabaseClient: async () => db }
      if (name === '@/lib/crypto') return { encryptToken: token => `encrypted:${token}` }
      if (name === '@/lib/temporary-data') return { purgeProviderTemporaryData: () => { throw Error('Unexpected purge') } }
      return require(name)
    }
    vm.runInNewContext(`(function(require,module,exports,process,Buffer,URLSearchParams,AbortSignal,fetch){${js}\n})`)(
      req, module, module.exports,
      { env: { SHOPIFY_CLIENT_ID: 'test-client', SHOPIFY_CLIENT_SECRET: options.missingSecret ? '' : 'test-secret', NEXT_PUBLIC_APP_URL: 'https://panel.example' } },
      Buffer, URLSearchParams, AbortSignal, async () => { calls++; return Response.json({ access_token: 'test-token' }) },
    )
    return module.exports
  }
  return { load, saved, calls: () => calls }
}

test('Shopify login preserves the validated store and rejects unsafe return paths', async () => {
  const h = harness({ signedOut: true })
  const route = h.load('app/api/oauth/shopify/route.ts')
  const response = await route.GET({ nextUrl: new URL('https://panel.example/api/oauth/shopify?shop=Demo.myshopify.com') })
  const next = new URL(response.headers.get('location')).searchParams.get('next')
  assert.equal(next, '/api/oauth/shopify?shop=demo.myshopify.com')
  const { safeReturnPath } = h.load('lib/auth/return-path.ts')
  assert.equal(safeReturnPath(next), next)
  for (const bad of ['https://evil.example', '//evil.example', '/api/oauth/shopify?shop=demo.myshopify.com&next=https://evil.example', '/api/oauth/shopify?shop=evil.example', null]) {
    assert.equal(safeReturnPath(bad), '/dashboard')
  }
})

test('OAuth starts only with complete configuration and a valid Shopify hostname', async () => {
  for (const shop of ['evil.example', 'demo.myshopify.com.evil.example', 'demo.myshopify.com@evil.example', 'demo.myshopify.com/path']) {
    const h = harness()
    const response = await h.load('app/api/oauth/shopify/route.ts').GET({ nextUrl: new URL(`https://panel.example/api/oauth/shopify?shop=${encodeURIComponent(shop)}`) })
    assert.equal(new URL(response.headers.get('location')).pathname, '/integrations')
  }
  const h = harness({ missingSecret: true })
  const response = await h.load('app/api/oauth/shopify/route.ts').GET({ nextUrl: new URL('https://panel.example/api/oauth/shopify?shop=demo') })
  assert.equal(new URL(response.headers.get('location')).pathname, '/integrations')
})

function callbackRequest(badSignature = false) {
  const params = new URLSearchParams({ code: 'code', shop: 'demo.myshopify.com', state: 'state', timestamp: String(Math.floor(Date.now() / 1000)) })
  const message = [...params].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('&')
  params.set('hmac', badSignature ? 'invalid' : crypto.createHmac('sha256', 'test-secret').update(message).digest('hex'))
  const cookies = { shopify_oauth_user: 'alice', shopify_oauth_state: 'state', shopify_oauth_shop: 'demo.myshopify.com' }
  return { nextUrl: { searchParams: params }, cookies: { get: key => ({ value: cookies[key] }) } }
}

test('Verified callback saves encrypted credentials only in the current workspace', async () => {
  const h = harness()
  const response = await h.load('app/api/oauth/shopify/callback/route.ts').GET(callbackRequest())
  assert.equal(new URL(response.headers.get('location')).searchParams.get('connected'), 'shopify')
  assert.equal(h.saved[0].workspace_id, 'alice-workspace')
  assert.equal(h.saved[0].access_token_encrypted, 'encrypted:test-token')
  assert.equal(h.saved[0].last_sync_at, null)
})

test('Failed save never reports a successful connection', async () => {
  const h = harness({ saveFails: true })
  const response = await h.load('app/api/oauth/shopify/callback/route.ts').GET(callbackRequest())
  const url = new URL(response.headers.get('location'))
  assert.equal(url.searchParams.has('connected'), false)
  assert.match(url.searchParams.get('error'), /Could not save/)
})

test('Invalid Shopify signature never exchanges a token or writes credentials', async () => {
  const h = harness()
  await h.load('app/api/oauth/shopify/callback/route.ts').GET(callbackRequest(true))
  assert.equal(h.calls(), 0)
  assert.equal(h.saved.length, 0)
})
