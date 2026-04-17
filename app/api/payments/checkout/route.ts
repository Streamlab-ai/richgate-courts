// POST /api/payments/checkout
// Creates a pending guest booking and initiates a PayMongo GCash payment.
// If monetization is OFF, booking is confirmed immediately (no payment).

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'
import crypto from 'crypto'

const PAYMENT_HOLD_MINUTES = 15  // slot held while guest pays

async function getSettings() {
  const rows = await db.appSetting.findMany({
    where: {
      key: {
        in: [
          'monetization_enabled',
          'price_per_hour_tennis',
          'price_per_hour_pickleball',
          'price_per_hour_basketball',
        ],
      },
    },
  })
  const map = Object.fromEntries(rows.map(r => [r.key, r.value]))
  return {
    monetizationEnabled: (map['monetization_enabled'] ?? 'false') === 'true',
    prices: {
      tennis:     Number(map['price_per_hour_tennis']     ?? 200),
      pickleball: Number(map['price_per_hour_pickleball'] ?? 200),
      basketball: Number(map['price_per_hour_basketball'] ?? 400),
    },
  }
}

function calcAmount(sportType: string, durationMinutes: number, prices: Record<string, number>): number {
  const rate = prices[sportType as keyof typeof prices] ?? 200
  return Math.round((durationMinutes / 60) * rate)
}

export async function POST(request: NextRequest) {
  // Rate limit: 10 checkout attempts per minute per IP (prevents slot exhaustion)
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const { limited } = rateLimit(`checkout:${ip}`, 10, 60_000)
  if (limited) {
    return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 })
  }

  const body = await request.json()
  const { courtId, sportType, date, startTime, endTime, guestName, guestEmail, guestPhone } = body

  if (!courtId || !sportType || !date || !startTime || !endTime || !guestName || !guestEmail || !guestPhone) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
  }

  // Verify slot is still available
  const existingBooking = await db.booking.findFirst({
    where: {
      courtId, date,
      startTime: { lt: endTime },
      endTime:   { gt: startTime },
      status:    { in: ['confirmed', 'pending_payment'] },
      ...(sportType !== 'pickleball' ? {} : undefined),
    },
  })

  // For tennis/basketball — any overlap blocks
  if (sportType !== 'pickleball' && existingBooking) {
    return NextResponse.json({ error: 'This slot is no longer available. Please choose another time.' }, { status: 409 })
  }

  const startMin = startTime.split(':').map(Number).reduce((h: number, m: number) => h * 60 + m)
  const endMin   = endTime.split(':').map(Number).reduce((h: number, m: number) => h * 60 + m)
  const durationMinutes = endMin - startMin

  const { monetizationEnabled, prices } = await getSettings()
  const amountPhp = calcAmount(sportType, durationMinutes, prices)
  const amountCentavos = amountPhp * 100

  // ── Monetization OFF — confirm immediately, no payment ──────────────────────
  if (!monetizationEnabled) {
    const qrToken = crypto.randomBytes(16).toString('hex')
    const booking = await db.booking.create({
      data: {
        courtId, sportType, date, startTime, endTime, durationMinutes,
        isGuest: true, guestName, guestEmail, guestPhone,
        status: 'confirmed',
        paymentStatus: 'not_required',
        qrToken,
      },
    })
    return NextResponse.json({ ok: true, bookingId: booking.id, mode: 'free', redirect: `/book/confirmed?ref=${booking.id}` })
  }

  // ── Monetization ON — create pending booking, call PayMongo ─────────────────
  const paymentExpiresAt = new Date(Date.now() + PAYMENT_HOLD_MINUTES * 60 * 1000)
  const qrToken = crypto.randomBytes(16).toString('hex')

  const booking = await db.booking.create({
    data: {
      courtId, sportType, date, startTime, endTime, durationMinutes,
      isGuest: true, guestName, guestEmail, guestPhone,
      status: 'pending_payment',
      paymentStatus: 'pending',
      amountPaid: amountCentavos,
      paymentExpiresAt,
      qrToken,
    },
  })

  // ── Call PayMongo GCash source API ──────────────────────────────────────────
  const secretKey = process.env.PAYMONGO_SECRET_KEY
  if (!secretKey) {
    // PayMongo not configured — return pending booking anyway (for testing)
    console.warn('[payments/checkout] PAYMONGO_SECRET_KEY not set — skipping PayMongo call')
    return NextResponse.json({
      ok: true,
      bookingId: booking.id,
      mode: 'test',
      redirect: `/book/confirmed?ref=${booking.id}&test=1`,
    })
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? request.nextUrl.origin
  const successUrl = `${baseUrl}/book/confirmed?ref=${booking.id}`
  const failedUrl  = `${baseUrl}/book?error=payment_failed`

  try {
    const pmRes = await fetch('https://api.paymongo.com/v1/sources', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(secretKey + ':').toString('base64')}`,
      },
      body: JSON.stringify({
        data: {
          attributes: {
            amount:   amountCentavos,
            currency: 'PHP',
            type:     'gcash',
            redirect: { success: successUrl, failed: failedUrl },
            billing: {
              name:  guestName,
              email: guestEmail,
              phone: guestPhone,
            },
          },
        },
      }),
    })

    const pmData = await pmRes.json()
    if (!pmRes.ok) {
      console.error('[payments/checkout] PayMongo error:', pmData)
      // Clean up pending booking
      await db.booking.delete({ where: { id: booking.id } })
      return NextResponse.json({ error: 'Payment initiation failed. Please try again.' }, { status: 502 })
    }

    const sourceId       = pmData.data.id
    const checkoutUrl    = pmData.data.attributes.redirect.checkout_url

    // Store the PayMongo source ID so the webhook can match it
    await db.booking.update({
      where: { id: booking.id },
      data:  { paymentRef: sourceId },
    })

    return NextResponse.json({ ok: true, bookingId: booking.id, checkoutUrl, mode: 'gcash' })
  } catch (err) {
    console.error('[payments/checkout] fetch error:', err)
    await db.booking.delete({ where: { id: booking.id } })
    return NextResponse.json({ error: 'Payment service unavailable. Please try again.' }, { status: 502 })
  }
}
