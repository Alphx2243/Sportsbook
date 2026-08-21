import { randomBytes } from 'crypto'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireServerEnv } from '@/lib/env'

export async function GET(request: Request) {
  const state = randomBytes(16).toString('hex')
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  const origin = new URL(request.url).origin

  url.searchParams.set('client_id', requireServerEnv('GOOGLE_CLIENT_ID'))
  url.searchParams.set('redirect_uri', `${origin}/api/auth/google/callback`)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', 'openid email profile')
  url.searchParams.set('state', state)
  url.searchParams.set('prompt', 'select_account')

  const cookieStore = await cookies()
  cookieStore.set('google_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 10 * 60,
    path: '/',
  })

  return NextResponse.redirect(url)
}
