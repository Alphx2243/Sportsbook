import { SignJWT } from 'jose'
import { cookies } from 'next/headers'
import { getJwtSecret } from '@/lib/auth-config'

export async function createSession(user: { id: string; email: string; role: string }) {
  const token = await new SignJWT({ userId: user.id, email: user.email, role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(getJwtSecret())

  const cookieStore = await cookies()
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })
}
