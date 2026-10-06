const MIN_SECRET_LENGTH = 32

export type EdgeSessionClaims = {
  userId?: string
  email?: string
  role?: string
}

export async function verifyEdgeSessionToken(token: string): Promise<EdgeSessionClaims> {
  const [encodedHeader, encodedPayload, signature] = token.split('.')
  if (!encodedHeader || !encodedPayload || !signature) throw new Error('Invalid session token')

  const header = JSON.parse(decodeBase64Url(encodedHeader))
  if (header.alg !== 'HS256') throw new Error('Unsupported session token')

  const expectedSignature = await signHmac(`${encodedHeader}.${encodedPayload}`)
  if (!timingSafeEqual(signature, expectedSignature)) throw new Error('Invalid session token')

  const payload = JSON.parse(decodeBase64Url(encodedPayload))
  if (typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now()) throw new Error('Session expired')

  return {
    userId: typeof payload.userId === 'string' ? payload.userId : undefined,
    email: typeof payload.email === 'string' ? payload.email : undefined,
    role: typeof payload.role === 'string' ? payload.role : undefined,
  }
}

async function signHmac(value: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    getJwtSecret(),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value))
  return encodeBase64Url(new Uint8Array(signature))
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret || secret === 'supersecretkey123' || secret.length < MIN_SECRET_LENGTH) {
    throw new Error(`JWT_SECRET must be set to a unique value of at least ${MIN_SECRET_LENGTH} characters.`)
  }
  return new TextEncoder().encode(secret)
}

function decodeBase64Url(value: string) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=')
  const binary = atob(base64)
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)))
}

function encodeBase64Url(value: Uint8Array) {
  let binary = ''
  value.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function timingSafeEqual(left: string, right: string) {
  if (left.length !== right.length) return false
  let diff = 0
  for (let index = 0; index < left.length; index++) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }
  return diff === 0
}
