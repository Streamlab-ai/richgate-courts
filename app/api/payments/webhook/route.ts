// POST /api/payments/webhook
// Receives PayMongo events. Confirms booking when GCash payment clears.

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import crypto from 'crypto'

function verifySignature(rawBody: string, sigHeader: string | null, webhookSecret: string): boolean {
  if (!sigHeader) return false
  // PayMongo signature: "t=<timestamp>,te=<hmac>"
  const parts = Object.fromEntries(sigHeader.split(',').map(p => p.split('=')))
  const timestamp = parts['t']
  const testSignature = parts['te'] ?? parts['li'] // li = live, te = test
  if (!timestamp || !testSignature) return false
  const payload = `${timestamp}.${rawBody}`
  const expected = crypto.createHmac('sha256', webhookSecret).update(payload).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(testSignature))
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const sigHeader = request.headers.get('paymongo-signature')
  const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET

  // Verify signature if webhook secret is configured
  if (webhookSecret && !verifySignature(rawBody, sigHeader, webhookSecret)) {
    console.warn('[payments/webhook] Signature verification failed')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: { data: { attributes: { type: string; data: { attributes: { source?: { id: string } } } } } }
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const eventType = event?.data?.attributes?.type
  const sourceId  = event?.data?.attributes?.data?.attributes?.source?.id

  // We only care about payment.paid which means the source was charged successfully
  if (eventType !== 'payment.paid' || !sourceId) {
    return NextResponse.json({ ok: true, ignored: true })
  }

  // Find the booking by its PayMongo source reference
  const booking = await db.booking.findFirst({
    where: { paymentRef: sourceId, status: 'pending_payment' },
    include: { member: { select: { email: true, fullName: true } } },
  })

  if (!booking) {
    // Already handled or not found — return 200 so PayMongo doesn't retry
    return NextResponse.json({ ok: true, skipped: true })
  }

  // Confirm the booking
  await db.booking.update({
    where: { id: booking.id },
    data:  { status: 'confirmed', paymentStatus: 'paid' },
  })

  // Send confirmation email
  try {
    const { sendNotification } = await import('@/services/notifications')

    if (booking.guestEmail && booking.guestName) {
      // Guest booking
      await sendNotification({
        profileId: booking.id,             // no real profileId — guest booking
        toEmail:   booking.guestEmail!,    // direct override
        toName:    booking.guestName!,
        type: 'guest_booking_confirmed',
        subject: '✅ Your court booking is confirmed!',
        body: [
          `Hi ${booking.guestName},`,
          ``,
          `Your booking is confirmed. Here are your details:`,
          ``,
          `Court booking ID: ${booking.id.slice(0, 8).toUpperCase()}`,
          `Date: ${booking.date}`,
          `Time: ${booking.startTime} – ${booking.endTime}`,
          `Sport: ${booking.sportType.charAt(0).toUpperCase() + booking.sportType.slice(1)}`,
          `Amount paid: ₱${(booking.amountPaid ?? 0) / 100}`,
          ``,
          `Please show this email or your booking reference at the front desk.`,
          ``,
          `See you on the court!`,
        ].join('\n'),
        channel: 'email',
      })
    } else if (booking.memberId && (booking as { member?: { email: string; fullName: string } | null }).member?.email) {
      // BPTL member booking
      const memberEmail = (booking as { member?: { email: string; fullName: string } | null }).member!.email
      const memberName  = (booking as { member?: { email: string; fullName: string } | null }).member!.fullName
      await sendNotification({
        profileId: booking.memberId,
        toEmail:   memberEmail,
        toName:    memberName,
        type: 'booking_confirmed',
        subject: '✅ Your court booking is confirmed!',
        body: [
          `Hi ${memberName},`,
          ``,
          `Your booking is confirmed. Here are your details:`,
          ``,
          `Court booking ID: ${booking.id.slice(0, 8).toUpperCase()}`,
          `Date: ${booking.date}`,
          `Time: ${booking.startTime} – ${booking.endTime}`,
          `Sport: ${booking.sportType.charAt(0).toUpperCase() + booking.sportType.slice(1)}`,
          `Amount paid: ₱${(booking.amountPaid ?? 0) / 100}`,
          ``,
          `Please show your QR code to security for check-in.`,
          ``,
          `See you on the court!`,
        ].join('\n'),
        channel: 'email',
      })
    }
  } catch (err) {
    console.error('[payments/webhook] Email send error:', err)
  }

  return NextResponse.json({ ok: true })
}
