import { createHash, randomBytes } from 'node:crypto'

export const newSessionToken = () => randomBytes(32).toString('hex')
export const sessionHash = (token: string) => createHash('sha256').update(token).digest('hex')

export function liveSessionFilter(token: string, now = new Date()) {
  return { tokenHash: sessionHash(token), expiresAt: { gt: now } }
}
