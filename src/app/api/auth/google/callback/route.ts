import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireServerEnv } from '@/lib/env'
import { createSession } from '@/lib/session'
import { getDefaultRouteForRole } from '@/lib/roles'

type GoogleUser = {
  sub: string
  email: string
  email_verified: boolean
  name?: string
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const state = requestUrl.searchParams.get('state')
  const cookieStore = await cookies()
  const expectedState = cookieStore.get('google_oauth_state')?.value
  cookieStore.delete('google_oauth_state')

  if (!code || !state || state !== expectedState) {
    return NextResponse.redirect(new URL('/login?error=google', requestUrl.origin))
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: requireServerEnv('GOOGLE_CLIENT_ID'),
      client_secret: requireServerEnv('GOOGLE_CLIENT_SECRET'),
      redirect_uri: `${requestUrl.origin}/api/auth/google/callback`,
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenRes.ok) return NextResponse.redirect(new URL('/login?error=google', requestUrl.origin))
  const token = await tokenRes.json()

  const profileRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${token.access_token}` },
  })
  if (!profileRes.ok) return NextResponse.redirect(new URL('/login?error=google', requestUrl.origin))

  const profile = (await profileRes.json()) as GoogleUser
  console.log("Profile:: ", profile);
  const email = profile.email?.toLowerCase()
  if (!profile.email_verified || !email.endsWith('@iiitd.ac.in')) {
    return NextResponse.redirect(new URL('/login?error=domain', requestUrl.origin))
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ googleId: profile.sub }, { email }] },
  })
  let firstName = profile.name?.split(' ')[0];
  let roll = "20" + profile.email.substring(firstName?.length || 0).split('@')[0];
  


  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: { googleId: profile.sub, email, name: existing.name || profile.name || email },
      })
    : await prisma.user.create({
        data: {
          googleId: profile.sub,
          email,
          name: profile.name || email,
          phone: '',
          rollNumber: roll,
        },
      })

  await createSession(user)
  return NextResponse.redirect(new URL(getDefaultRouteForRole(user.role), requestUrl.origin))
}
