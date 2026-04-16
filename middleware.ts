import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE CLASSIFICATION
// ─────────────────────────────────────────────────────────────────────────────

// Public routes — no auth required
const PUBLIC_ROUTES = ['/login', '/register', '/reset-password']

// Member routes — requires authenticated + active profile
const MEMBER_ROUTES = ['/home', '/reserve', '/reservations', '/profile']

// Pending route — requires authenticated user (any status)
const PENDING_ROUTE = '/pending'

// Admin routes — requires admin role
const ADMIN_ROUTES = [
  '/dashboard',
  '/registrations',
  '/members',
  '/bookings',
  '/waitlists',
  '/recurring',
  '/settings',
  '/blackout-dates',
  '/sport-rules',
  '/checkin',
  '/reports',
]

function matchesRoute(pathname: string, routes: string[]): boolean {
  return routes.some(
    (r) => pathname === r || pathname.startsWith(r + '/')
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────────────
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  // Create a Supabase client that can read/write cookies in middleware context
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — must be called before any redirects
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // ── API routes: only ensure session is refreshed ──────────────────────────
  if (pathname.startsWith('/api/')) {
    return response
  }

  // ── Root redirect ──────────────────────────────────────────────────────────
  if (pathname === '/') {
    if (!user) return NextResponse.redirect(new URL('/login', request.url))
    // Role-aware landing — profile check done in page-level guards
    return NextResponse.redirect(new URL('/home', request.url))
  }

  // ── Public routes: redirect authenticated users away ─────────────────────
  if (matchesRoute(pathname, PUBLIC_ROUTES)) {
    if (user) {
      // Let page-level requireGuest() handle the specific landing
      return NextResponse.redirect(new URL('/home', request.url))
    }
    return response
  }

  // ── All protected routes: redirect unauthenticated to /login ─────────────
  if (!user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // ── Admin routes: fetch role to enforce access ────────────────────────────
  if (matchesRoute(pathname, ADMIN_ROUTES)) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.redirect(new URL('/home', request.url))
    }
  }

  // ── Member routes: block pending/suspended members ────────────────────────
  if (matchesRoute(pathname, MEMBER_ROUTES)) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('status')
      .eq('id', user.id)
      .single()

    if (!profile || profile.status === 'pending') {
      return NextResponse.redirect(new URL('/pending', request.url))
    }

    if (profile.status !== 'active') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Run middleware on all routes except:
     * - _next/static, _next/image (Next.js internals)
     * - favicon.ico
     * - public/* files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
