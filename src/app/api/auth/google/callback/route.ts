import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import prisma from '@/lib/prisma'
import { requireServerEnv } from '@/lib/env'
import { createSession } from '@/lib/session'
import { getDefaultRouteForRole } from '@/lib/roles'
import { deriveRollNumberFromInstituteEmail } from '@/lib/roll-number'

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
  const email = profile.email?.toLowerCase()
  if (!profile.email_verified || (!email.endsWith('@iiitd.ac.in') && !(email == 'guard.iiitd@gmail.com'))) {
    return NextResponse.redirect(new URL('/login?error=domain', requestUrl.origin))
  }

  let roll = ''
  try {
    roll = deriveRollNumberFromInstituteEmail(email, profile.name)
  } catch {
    roll = email.split('@')[0].toUpperCase()
  }
  


  const [user] = await prisma.$queryRaw<any[]>`
    WITH signup_lock AS (
      SELECT 1 AS locked FROM pg_advisory_xact_lock(500)
    ),
    existing AS (
      SELECT "id"
      FROM "User", signup_lock
      WHERE "googleId" = ${profile.sub} OR "email" = ${email}
      LIMIT 1
    ),
    updated AS (
      UPDATE "User"
      SET "googleId" = ${profile.sub}, "email" = ${email}, "name" = COALESCE(NULLIF("name", ''), ${profile.name || email}), "rollNumber" = COALESCE(NULLIF("rollNumber", ''), ${roll}), "updatedAt" = NOW()
      WHERE "id" = (SELECT "id" FROM existing)
      RETURNING *
    ),
    created AS (
      INSERT INTO "User" ("id", "googleId", "email", "name", "phone", "rollNumber", "updatedAt")
      SELECT ${randomUUID()}, ${profile.sub}, ${email}, ${profile.name || email}, '', ${roll}, NOW()
      FROM signup_lock
      WHERE NOT EXISTS (SELECT 1 FROM existing)
        AND (SELECT COUNT(*) FROM "User") < 500
      RETURNING *
    )
    SELECT * FROM updated
    UNION ALL
    SELECT * FROM created
  `

  if (!user) return NextResponse.redirect(new URL('/login?error=capacity', requestUrl.origin))

  await createSession(user)
  return NextResponse.redirect(new URL(getDefaultRouteForRole(user.role), requestUrl.origin))
}
