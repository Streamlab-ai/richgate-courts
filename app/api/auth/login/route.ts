import { NextRequest, NextResponse } from 'next/server'
import { compare } from '@node-rs/bcrypt'
import { db } from '@/lib/db'
import { createSession } from '@/lib/session'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 attempts per minute per IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const { limited, retryAfterMs } = rateLimit(`login:${ip}`, 5, 60_000)
    if (limited) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) } },
      )
    }

    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'email and password are required' },
        { status: 400 }
      )
    }

    const profile = await db.profile.findUnique({ where: { email } })

    // Valid bcrypt hash of random string — ensures constant-time comparison
    // even when the email doesn't exist (prevents timing-based user enumeration)
    const dummyHash = '$2a$12$LJ3m4ys3Lg2VE9Dqk.6HxOBBSFkGR1KQFHE0xTG7sDJPnA.6Vq6G'
    const valid = profile
      ? await compare(password, profile.passwordHash)
      : await compare(password, dummyHash)

    if (!profile || !valid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    await createSession({
      sub: profile.id,
      email: profile.email,
      role: profile.role,
      status: profile.status,
    })

    // Route by role
    let redirect: string
    if (profile.role === 'guard') {
      redirect = '/guard'
    } else {
      redirect = profile.status === 'active' ? '/home' : '/pending'
    }

    return NextResponse.json({ ok: true, redirect })
  } catch (err) {
    console.error('[login]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
