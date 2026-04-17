import { NextResponse, type NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE CLASSIFICATION
// ─────────────────────────────────────────────────────────────────────────────

const PUBLIC_ROUTES  = ['/login', '/register', '/reset-password', '/book']
const MEMBER_ROUTES  = ['/home', '/reserve', '/reservations', '/profile']
const ADMIN_ROUTES   = [
  '/dashboard', '/registrations', '/members', '/bookings',
  '/waitlists', '/recurring', '/settings', '/blackout-dates',
  '/sport-rules', '/checkin', '/reports',
]
const GUARD_ROUTES   = ['/guard']

function matchesRoute(pathname: string, routes: string[]): boolean {
  return routes.some((r) => pathname === r || pathname.startsWith(r + '/'))
}

// ─────────────────────────────────────────────────────────────────────────────
// JWT verification — no network calls, pure crypto
// ─────────────────────────────────────────────────────────────────────────────

interface SessionPayload {
  sub: string
  email: string
  role: string  // 'super_admin' | 'admin' | 'hoa' | 'bptl' | 'guard'
  status: string
}

async function getSessionFromRequest(request: NextRequest): Promise<SessionPayload | null> {
  const token = request.cookies.get('auth-token')?.value
  if (!token) return null

  const secret = process.env.SESSION_SECRET
  if (!secret) return null

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret))
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PROXY  (Next.js 16 — renamed from middleware)
// ─────────────────────────────────────────────────────────────────────────────
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // API routes — no redirect logic
  if (pathname.startsWith('/api/')) return NextResponse.next()

  const session = await getSessionFromRequest(request)

  // Root redirect
  if (pathname === '/') {
    return NextResponse.redirect(
      new URL(session ? '/home' : '/login', request.url)
    )
  }

  // Public routes — send logged-in users away
  if (matchesRoute(pathname, PUBLIC_ROUTES)) {
    if (session) {
      const dest = session.role === 'guard' ? '/guard' : '/home'
      return NextResponse.redirect(new URL(dest, request.url))
    }
    return NextResponse.next()
  }

  // Guard routes
  if (matchesRoute(pathname, GUARD_ROUTES)) {
    if (!session) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(loginUrl)
    }
    if (session.role !== 'guard' && session.role !== 'admin' && session.role !== 'super_admin') {
      return NextResponse.redirect(new URL('/home', request.url))
    }
    return NextResponse.next()
  }

  // All other routes require auth
  if (!session) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Admin routes — check role claim in JWT (no DB call needed)
  if (matchesRoute(pathname, ADMIN_ROUTES)) {
    if (session.role !== 'admin' && session.role !== 'super_admin') {
      return NextResponse.redirect(new URL('/home', request.url))
    }
  }

  // Guard role — block from all member routes (guards have their own /guard UI)
  // Exception: /profile is allowed so guards can view/edit their own account.
  if (session.role === 'guard') {
    const guardBlockedRoutes = ['/home', '/reserve', '/reservations']
    if (matchesRoute(pathname, guardBlockedRoutes)) {
      return NextResponse.redirect(new URL('/guard', request.url))
    }
  }

  // Member routes — check status claim in JWT
  if (matchesRoute(pathname, MEMBER_ROUTES)) {
    if (!session.status || session.status === 'pending') {
      return NextResponse.redirect(new URL('/pending', request.url))
    }
    if (session.status !== 'active') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
