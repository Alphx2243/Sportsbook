// done
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyEdgeSessionToken } from '@/lib/edge-auth'
import { canAccessAdminPath, getDefaultRouteForRole, isPortalRole } from '@/lib/roles'

const allowedOrigins = [
  'https://sportsbook.iiitd.edu.in',
  'http://sportsbook.iiitd.edu.in'
];

function shouldUseHttps(request: NextRequest) {
  const host = request.headers.get('host');
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const protocol = forwardedProto ?? request.nextUrl.protocol.replace(':', '');
  return host === 'sportsbook.iiitd.edu.in' && protocol === 'http';
}

function createNonce() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let value = '';
  bytes.forEach((byte) => {
    value += String.fromCharCode(byte);
  });
  return btoa(value);
}

function nonceHeaders(request: NextRequest) {
  const isDev = process.env.NODE_ENV === 'development';
  const nonce = createNonce();
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' data: https:",
    "font-src 'self' https:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'self'",
    "form-action 'self'",
  ].join('; ');
  const headers = new Headers(request.headers);
  headers.set('x-nonce', nonce);
  headers.set('Content-Security-Policy', csp);
  return { csp, headers };
}

function applySecurityHeaders(response: NextResponse, csp: string) {
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  return response;
}


export async function middleware(request: NextRequest) {
  if (shouldUseHttps(request)) {
    const url = request.nextUrl.clone();
    url.protocol = 'https:';
    return NextResponse.redirect(url, 308);
  }

  const { csp, headers } = nonceHeaders(request);

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    const origin = request.headers.get('origin');
    const isServerAction = request.headers.has('next-action');
    if (!isServerAction && origin && !allowedOrigins.includes(origin)) {
      return applySecurityHeaders(new NextResponse('Forbidden', { status: 403 }), csp);
    }
  }


  if (request.nextUrl.pathname.startsWith('/admin') || request.nextUrl.pathname.startsWith('/booking-scanner') || request.nextUrl.pathname.startsWith('/gym-scanner')) {
    const session = request.cookies.get('session')?.value;
    if (!session) {
      return redirectOrReject(request, csp);
    }

    try {
      const payload = await verifyEdgeSessionToken(session);
      if (!payload.userId || !isPortalRole(payload.role)) {
        return redirectOrReject(request, csp);
      }

      if (!canAccessAdminPath(payload.role, request.nextUrl.pathname)) {
        return redirectOrReject(request, csp, getDefaultRouteForRole(payload.role));
      }
    } catch {
      return redirectOrReject(request, csp);
    }
  }

  const response = NextResponse.next({ request: { headers } });
  return applySecurityHeaders(response, csp);
}
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)',],
}

function redirectOrReject(request: NextRequest, csp: string, redirectPath = '/login') {
  if (request.method !== 'GET') {
    return applySecurityHeaders(new NextResponse('Unauthorized', { status: 401 }), csp);
  }

  const loginUrl = new URL(redirectPath, request.url);
  return applySecurityHeaders(NextResponse.redirect(loginUrl), csp);
}
