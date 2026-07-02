import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'

// AES-256-GCM encryption for integration tokens stored in the database.
// Values are stored as: enc:v1:<iv>:<authTag>:<ciphertext> (all base64).
// Legacy plaintext rows pass through decryptToken unchanged, so existing
// connections keep working and get encrypted the next time they are saved.

const PREFIX = 'enc:v1:'

let cachedKey: Buffer | null | undefined

function getKey(): Buffer | null {
  if (cachedKey !== undefined) return cachedKey
  const secret = process.env.TOKEN_ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) {
    console.warn('[crypto] TOKEN_ENCRYPTION_KEY not set — integration tokens will be stored unencrypted')
    cachedKey = null
    return null
  }
  cachedKey = scryptSync(secret, 'founder-weekly-token-v1', 32)
  return cachedKey
}

export function encryptToken(plain: string): string {
  if (!plain) return ''
  if (plain.startsWith(PREFIX)) return plain // already encrypted
  const key = getKey()
  if (!key) return plain
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`
}

export function decryptToken(stored: string): string {
  if (!stored || !stored.startsWith(PREFIX)) return stored || ''
  const key = getKey()
  if (!key) {
    console.error('[crypto] Cannot decrypt token: TOKEN_ENCRYPTION_KEY is not set')
    return ''
  }
  try {
    const [ivB64, tagB64, dataB64] = stored.slice(PREFIX.length).split(':')
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'))
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
    return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8')
  } catch (err) {
    console.error('[crypto] Token decryption failed', err)
    return ''
  }
}
