const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

// Exercise the real route and account code with a small, isolated database double.
// No production credentials or network requests are used.
function harness() {
  let user = 'alice'
  const rows = new Map()
  const db = {
    auth: { getUser: async () => ({ data: { user: user ? { id: user } : null } }) },
    from(table) {
      const filters = {}
      const query = {
        select() { return query },
        eq(key, value) { filters[key] = value; return query },
        like() { return query },
        async single() { return { data: { workspace_id: `${filters.user_id}-workspace` } } },
        async upsert(row) { rows.set(`${row.workspace_id}:${row.provider}`, row); return { error: null } },
        then(resolve) {
          return Promise.resolve({ data: [...rows.values()].filter(row =>
            Object.entries(filters).every(([key, value]) => row[key] === value)), error: null }).then(resolve)
        },
      }
      assert.ok(['workspace_members', 'integration_connections'].includes(table))
      return query
    },
  }
  const cache = {}
  function load(file) {
    file = path.resolve(__dirname, '..', file)
    if (cache[file]) return cache[file].exports
    const module = { exports: {} }
    cache[file] = module
    const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText
    const requireMock = name => {
      if (name === 'server-only') return {}
      if (name === 'next/server') return { NextResponse: { json: (data, init) => Response.json(data, init), redirect: url => Response.redirect(url, 307) } }
      if (name === '@/lib/supabase/server') return { createServerSupabaseClient: async () => db }
      if (name === '@/lib/temporary-data') return { purgeProviderTemporaryData: () => { throw new Error('Unexpected data purge') } }
      if (name.startsWith('@/')) return load(`${name.slice(2)}.ts`)
      return require(name)
    }
    vm.runInNewContext(`(function(require,module,exports,process,Buffer){${js}\n})`, {})(
      requireMock, module, module.exports,
      { env: { TOKEN_ENCRYPTION_KEY: 'isolated-test-key', NEXT_PUBLIC_APP_URL: 'https://panel.example' } }, Buffer,
    )
    return module.exports
  }
  return { rows, load, setUser: value => { user = value } }
}

test('courier credentials belong to the signed-in workspace and survive logout', async () => {
  const h = harness()
  const route = h.load('app/api/couriers/connections/route.ts')
  const request = body => new Request('http://localhost/api/couriers/connections', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
  const saved = await route.POST(request({ provider: 'postex', workspace_id: 'bob-workspace', credentials: { postex_api_token: 'test-token' } }))
  assert.equal(saved.status, 200)
  const row = h.rows.get('alice-workspace:courier_postex')
  assert.ok(row.access_token_encrypted.startsWith('enc:v1:'))
  assert.ok(!row.access_token_encrypted.includes('test-token'))
  const result = await route.GET()
  assert.equal(result.headers.get('cache-control'), 'private, no-store')
  assert.deepEqual(await result.json(), { providers: ['postex'] })
  const account = h.load('lib/integrations/couriers/account.ts')
  assert.equal((await account.courierCredentials(await account.courierAccount())).postex_api_token, 'test-token')
  h.setUser(null)
  assert.equal((await route.GET()).status, 401)
  assert.equal((await route.POST(request({ provider: 'postex' }))).status, 401)
  h.setUser('bob')
  assert.deepEqual(await (await route.GET()).json(), { providers: [] })
  h.setUser('alice')
  assert.deepEqual(await (await route.GET()).json(), { providers: ['postex'] })
  assert.equal((await route.DELETE(request({ provider: 'postex' }))).status, 200)
  assert.equal(h.rows.get('alice-workspace:courier_postex').access_token_encrypted, '')
  assert.deepEqual(await (await route.GET()).json(), { providers: [] })
})

test('rejects unknown couriers and incomplete credentials without saving', async () => {
  const h = harness()
  const route = h.load('app/api/couriers/connections/route.ts')
  for (const body of [{ provider: '__proto__' }, { provider: 'leopards', credentials: { leopards_api_key: 'key' } }]) {
    const response = await route.POST(new Request('http://localhost', { method: 'POST', body: JSON.stringify(body) }))
    assert.equal(response.status, 400)
  }
  assert.equal(h.rows.size, 0)
})

test('OAuth callbacks reject a connection started under a different panel account', async () => {
  for (const provider of ['meta', 'google', 'shopify']) {
    const h = harness()
    const route = h.load(`app/api/oauth/${provider}/callback/route.ts`)
    const response = await route.GET({
      nextUrl: new URL('https://panel.example/callback?code=test&state=test&shop=test.myshopify.com'),
      cookies: { get: name => ({ value: name.endsWith('_user') ? 'bob' : 'test' }) },
    })
    assert.equal(response.status, 307)
    assert.match(response.headers.get('location'), /Your\+session\+changed/)
    assert.equal(h.rows.size, 0)
  }
})
