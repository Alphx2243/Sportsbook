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
  /*
   * CSRF protection
   */
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    const origin = request.headers.get('origin')
    const isServerAction = request.headers.has('next-action')

    if (
      !isServerAction &&
      origin &&
      !allowedOrigins.includes(origin)
    ) {
      return new NextResponse('Forbidden', {
        status: 403,
      })
    }
  }

  /*
   * Authentication / authorization
   */
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

      if (
        !canAccessAdminPath(
          payload.role,
          request.nextUrl.pathname
        )
      ) {
        return redirectOrReject(
          request,
          getDefaultRouteForRole(payload.role)
        )
      }
    } catch {
      return redirectOrReject(request)
    }
  }

  /*
   * IMPORTANT:
   *
   * Next.js development mode uses eval() for
   * React Fast Refresh / webpack development runtime.
   *
   * Therefore do NOT apply the strict production CSP
   * during npm run dev.
   */
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.next()
  }

  /*
   * Production CSP
   */
  const nonce = Buffer.from(
    crypto.randomUUID()
  ).toString('base64')

  const csp = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https:;
    font-src 'self' https:;
    connect-src 'self' https: wss: ws:;
    frame-src 'self' https://accounts.google.com;
    object-src 'none';
    base-uri 'self';
    frame-ancestors 'self';
    form-action 'self';
  `
    .replace(/\s{2,}/g, ' ')
    .trim()

  /*
   * Pass nonce to Next.js.
   */
  const requestHeaders = new Headers(request.headers)

  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', csp)

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  /*
   * Send CSP to browser.
   */
  response.headers.set(
    'Content-Security-Policy',
    csp
  )

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}

function redirectOrReject(
  request: NextRequest,
  redirectPath = '/login'
) {
  if (request.method !== 'GET') {
    return new NextResponse('Unauthorized', {
      status: 401,
    })
  }

  const loginUrl = new URL(
    redirectPath,
    request.url
  )

  return NextResponse.redirect(loginUrl)
}