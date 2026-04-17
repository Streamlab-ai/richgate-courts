import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { createSession } from '@/lib/session'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'email and password are required' },
        { status: 400 }
      )
    }

    const profile = await db.profile.findUnique({ where: { email } })

    // Constant-time compare to prevent timing attacks
    const dummyHash = '$2a$12$dummyhashfortimingprotection000000000000000000000000000'
    const valid = profile
      ? await bcrypt.compare(password, profile.passwordHash)
      : await bcrypt.compare(password, dummyHash)

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
      memberType: (profile as { memberType?: string }).memberType ?? 'hoa',
    })

    // Route by role
    let redirect: string
    if (profile.role === 'guard') {
      redirect = '/guard'
    } else if (profile.role === 'admin') {
      redirect = '/dashboard'
    } else {
      redirect = profile.status === 'active' ? '/home' : '/pending'
    }

    return NextResponse.json({ ok: true, redirect })
  } catch (err) {
    console.error('[login]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
