import { NextRequest, NextResponse } from 'next/server'
import { clearSession } from '@/lib/session'

export async function POST(request: NextRequest) {
  await clearSession()
  return NextResponse.redirect(new URL('/login', request.url), { status: 303 })
}

// GET kept for convenience (nav links use <a href="/api/auth/logout">)
// but only clears the session — no state mutation beyond cookie removal.
export async function GET(request: NextRequest) {
  await clearSession()
  return NextResponse.redirect(new URL('/login', request.url), { status: 303 })
}
