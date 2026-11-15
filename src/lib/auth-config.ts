// done
import { jwtVerify } from 'jose'

const MIN_SECRET_LENGTH = 32

export type SessionClaims = {
  userId?: string
  email?: string
  role?: string
}

export function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret || secret === 'supersecretkey123' || secret.length < MIN_SECRET_LENGTH) {
    throw new Error(`JWT_SECRET must be set to a unique value of at least ${MIN_SECRET_LENGTH} characters.`)
  }

  return new TextEncoder().encode(secret)
}

export async function verifySessionToken(token: string): Promise<SessionClaims> {
  const { payload } = await jwtVerify(token, getJwtSecret())
  return {
    userId: typeof payload.userId === 'string' ? payload.userId : undefined,
    email: typeof payload.email === 'string' ? payload.email : undefined,
    role: typeof payload.role === 'string' ? payload.role : undefined,
  }
}
