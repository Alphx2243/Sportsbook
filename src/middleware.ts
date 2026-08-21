import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyEdgeSessionToken } from '@/lib/edge-auth'
import {
  canAccessAdminPath,
  getDefaultRouteForRole,
  isPortalRole,
} from '@/lib/roles'

const allowedOrigins = [
  'https://sportsbook-admin.onrender.com',
  'http://sportsbook.iiitd.edu.in',
]

export async function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' https:",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'self'",
    "form-action 'self'",
  ].join('; ')

  // Pass nonce to Next.js through request headers
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)

  // Existing request validation
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    const origin = request.headers.get('origin')
    const isServerAction = request.headers.has('next-action')

    if (
      !isServerAction &&
      origin &&
      !allowedOrigins.includes(origin)
    ) {
      return new NextResponse('Forbidden', { status: 403 })
    }
  }

  // Existing admin/scanner authentication
  if (
    request.nextUrl.pathname.startsWith('/admin') ||
    request.nextUrl.pathname.startsWith('/booking-scanner') ||
    request.nextUrl.pathname.startsWith('/gym-scanner')
  ) {
    const session = request.cookies.get('session')?.value

    if (!session) {
      return redirectOrReject(request)
    }

    try {
      const payload = await verifyEdgeSessionToken(session)

      if (!payload.userId || !isPortalRole(payload.role)) {
        return redirectOrReject(request)
      }

      if (!canAccessAdminPath(payload.role, request.nextUrl.pathname)) {
        return redirectOrReject(
          request,
          getDefaultRouteForRole(payload.role)
        )
      }
    } catch {
      return redirectOrReject(request)
    }
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  // Send CSP from Next.js
  response.headers.set('Content-Security-Policy', csp)

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

function redirectOrReject(
  request: NextRequest,
  redirectPath = '/login'
) {
  if (request.method !== 'GET') {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const loginUrl = new URL(redirectPath, request.url)
  return NextResponse.redirect(loginUrl)
}