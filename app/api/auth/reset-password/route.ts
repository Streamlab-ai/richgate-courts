// POST /api/auth/reset-password
// Accepts { email } — generates a short-lived signed token and emails a reset link

import { NextRequest, NextResponse } from 'next/server'
import { SignJWT } from 'jose'
import { db } from '@/lib/db'
import { sendNotification } from '@/services/notifications'

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error('SESSION_SECRET env var is not set')
  return new TextEncoder().encode(secret)
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const profile = await db.profile.findUnique({ where: { email } })

    // Always return success — don't reveal whether the email exists
    if (!profile) {
      return NextResponse.json({ ok: true })
    }

    // Generate a signed reset token valid for 1 hour
    const token = await new SignJWT({ sub: profile.id, purpose: 'password-reset' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(getSecret())

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? request.nextUrl.origin
    const resetLink = `${baseUrl}/reset-password?token=${token}`

    await sendNotification({
      profileId: profile.id,
      type: 'password_reset',
      subject: 'Reset your Richgate Courts password',
      body: `Hi ${profile.fullName ?? 'there'},\n\nClick the link below to reset your password. This link expires in 1 hour.\n\n${resetLink}\n\nIf you didn't request this, you can safely ignore this email.`,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[reset-password]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
