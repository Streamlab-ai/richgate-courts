// POST /api/auth/reset-password/confirm
// Accepts { token, password } — verifies the token and updates the password hash

import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { hash } from '@node-rs/bcrypt'
import { db } from '@/lib/db'

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error('SESSION_SECRET env var is not set')
  return new TextEncoder().encode(secret)
}

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json()

    if (!token || !password) {
      return NextResponse.json({ error: 'Token and new password are required' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    // Verify the reset token
    let payload: { sub?: string; purpose?: string }
    try {
      const result = await jwtVerify(token, getSecret())
      payload = result.payload as { sub?: string; purpose?: string }
    } catch {
      return NextResponse.json({ error: 'Reset link is invalid or has expired' }, { status: 400 })
    }

    if (payload.purpose !== 'password-reset' || !payload.sub) {
      return NextResponse.json({ error: 'Invalid reset token' }, { status: 400 })
    }

    const profile = await db.profile.findUnique({ where: { id: payload.sub } })
    if (!profile) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const passwordHash = await hash(password, 12)
    await db.profile.update({
      where: { id: payload.sub },
      data: { passwordHash },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[reset-password/confirm]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
