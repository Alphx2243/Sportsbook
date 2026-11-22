import { cookies } from 'next/headers'
import prisma from './prisma'
import { newSessionToken, sessionHash } from './session-key'

export async function createSession(user: { id: string; email: string; role: string }) {
  const token = newSessionToken()
  const maxAge = 7 * 24 * 60 * 60
  const now = new Date()
  await prisma.$transaction([
    prisma.loginSession.deleteMany({ where: { expiresAt: { lte: now } } }),
    prisma.loginSession.create({ data: { tokenHash: sessionHash(token), userId: user.id, expiresAt: new Date(now.getTime() + maxAge * 1000) } }),
  ])

  const cookieStore = await cookies()
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge,
    path: '/',
  })
}
