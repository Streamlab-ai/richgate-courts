import { NextRequest, NextResponse } from 'next/server'
import { hash } from '@node-rs/bcrypt'
import { db } from '@/lib/db'
import { createSession } from '@/lib/session'
import { rateLimit } from '@/lib/rate-limit'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 3 registrations per minute per IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const { limited } = rateLimit(`register:${ip}`, 3, 60_000)
    if (limited) {
      return NextResponse.json(
        { error: 'Too many registration attempts. Please try again later.' },
        { status: 429 },
      )
    }

    const body = await request.json()
    const { email, password, fullName, phone } = body

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: 'email, password, and fullName are required' },
        { status: 400 }
      )
    }

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    const existing = await db.profile.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { error: 'An account with that email already exists' },
        { status: 409 }
      )
    }

    const passwordHash = await hash(password, 12)

    const profile = await db.profile.create({
      data: {
        email,
        passwordHash,
        fullName,
        phone: phone ?? null,
        role: 'member',
        status: 'pending',
        registrationRequest: {
          create: { status: 'pending' },
        },
      },
    })

    // Sign in immediately — new users land on /pending
    await createSession({
      sub: profile.id,
      email: profile.email,
      role: profile.role,
      status: profile.status,
    })

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (err) {
    console.error('[register]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
