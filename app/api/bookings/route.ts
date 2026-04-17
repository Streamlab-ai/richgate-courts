// GET  /api/bookings        — member's own bookings
// POST /api/bookings        — create multi-slot booking
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { createBookingGroup } from '@/services/booking/create-booking-group'
import type { SportType, TimeSlot } from '@/services/booking/types'
import crypto from 'crypto'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const bookings = await db.booking.findMany({
    where: { memberId: session.sub },
    include: { court: { select: { name: true, courtType: true } } },
    orderBy: [{ date: 'desc' }, { startTime: 'desc' }],
  })

  return NextResponse.json({ bookings })
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { courtId, sportType, slots, memberId: bodyMemberId, adminOverride: bodyAdminOverride, bookingMode } = body as {
    courtId: string
    sportType: SportType
    slots: TimeSlot[]
    memberId?: string
    adminOverride?: boolean
    bookingMode?: 'bptl_exclusive' | 'standard'
  }

  if (!courtId || !sportType || !Array.isArray(slots) || slots.length === 0) {
    return NextResponse.json({ error: 'courtId, sportType, and slots[] are required' }, { status: 400 })
  }

  // Admin can override member requirement and set adminOverride flag
  const isAdmin = session.role === 'admin' || session.role === 'super_admin'
  const memberId = isAdmin ? (bodyMemberId || session.sub) : session.sub
  const adminOverride = isAdmin ? (bodyAdminOverride ?? false) : false

  // Non-admin members must be active
  if (!isAdmin && session.status !== 'active') {
    return NextResponse.json({ error: 'Account is not active' }, { status: 403 })
  }

  // Fetch profile to get role
  const profile = await db.profile.findUnique({ where: { id: memberId }, select: { id: true, role: true, fullName: true, email: true } })

  // ── BPTL Payment flow ────────────────────────────────────────────────────
  if (profile?.role === 'bptl' && !isAdmin) {
    const court = await db.court.findUnique({ where: { id: courtId }, select: { courtType: true } })
    const secretKey = process.env.PAYMONGO_SECRET_KEY
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://richgate-courts.vercel.app'
    const bookingDate = slots[0]?.date
    const startTime = slots[0]?.startTime
    const endTime = slots[slots.length - 1]?.endTime

    const durationMinutes = slots.reduce((acc: number, s: TimeSlot) => {
      const [sh, sm] = s.startTime.split(':').map(Number)
      const [eh, em] = s.endTime.split(':').map(Number)
      return acc + (eh * 60 + em) - (sh * 60 + sm)
    }, 0)

    if (court?.courtType === 'tennis') {

      // ── Standard mode: BPTL books outside exclusive hours at per-hour rate ──
      if (bookingMode === 'standard') {
        const rateKey = 'price_per_hour_tennis'
        const rateSetting = await db.appSetting.findUnique({ where: { key: rateKey } })
        const pricePerHour = Number(rateSetting?.value ?? 200)
        const amountPhp = Math.round((durationMinutes / 60) * pricePerHour)
        const amountCentavos = amountPhp * 100
        const qrToken = crypto.randomBytes(16).toString('hex')
        const booking = await db.booking.create({
          data: {
            memberId: profile.id,
            courtId, sportType,
            date: bookingDate,
            startTime,
            endTime,
            durationMinutes,
            status: 'pending_payment',
            paymentStatus: 'pending',
            amountPaid: amountCentavos,
            bookerType: 'bptl',
            qrToken,
          },
        })
        if (!secretKey) {
          return NextResponse.json({ ok: true, bookingId: booking.id, mode: 'test', redirect: '/reservations' })
        }
        const pmRes = await fetch('https://api.paymongo.com/v1/sources', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Basic ${Buffer.from(secretKey + ':').toString('base64')}` },
          body: JSON.stringify({ data: { attributes: {
            amount: amountCentavos, currency: 'PHP', type: 'gcash',
            redirect: { success: `${baseUrl}/reservations?paid=1`, failed: `${baseUrl}/reserve?error=payment_failed` },
            billing: { name: profile.fullName, email: profile.email },
          }}}),
        })
        const pmData = await pmRes.json()
        if (!pmRes.ok) {
          await db.booking.delete({ where: { id: booking.id } })
          return NextResponse.json({ error: 'Payment initiation failed' }, { status: 502 })
        }
        await db.booking.update({ where: { id: booking.id }, data: { paymentRef: pmData.data.id } })
        return NextResponse.json({ ok: true, bookingId: booking.id, checkoutUrl: pmData.data.attributes.redirect.checkout_url, mode: 'bptl_standard_gcash' })
      }

      // ── BPTL exclusive mode: ₱100/day, deduped ───────────────────────────
      const alreadyPaid = await db.booking.findFirst({
        where: {
          memberId: profile.id,
          courtId,
          date: bookingDate,
          paymentStatus: 'paid',
          status: 'confirmed',
        },
      })

      if (alreadyPaid) {
        // Free — daily fee already paid
        const qrToken = crypto.randomBytes(16).toString('hex')
        const booking = await db.booking.create({
          data: {
            memberId: profile.id,
            courtId, sportType,
            date: bookingDate,
            startTime,
            endTime,
            durationMinutes,
            status: 'confirmed',
            paymentStatus: 'free_bptl',
            amountPaid: 0,
            bookerType: 'bptl',
            qrToken,
          },
        })
        return NextResponse.json({ ok: true, bookings: [booking], mode: 'bptl_free' })
      }

      // First booking of day — charge daily rate
      const rateSetting = await db.appSetting.findUnique({ where: { key: 'price_per_day_bptl_tennis' } })
      const dailyRatePhp = Number(rateSetting?.value ?? 100)
      const amountCentavos = dailyRatePhp * 100
      const qrToken = crypto.randomBytes(16).toString('hex')
      const booking = await db.booking.create({
        data: {
          memberId: profile.id,
          courtId, sportType,
          date: bookingDate,
          startTime,
          endTime,
          durationMinutes,
          status: 'pending_payment',
          paymentStatus: 'pending',
          amountPaid: amountCentavos,
          bookerType: 'bptl',
          qrToken,
        },
      })

      if (!secretKey) {
        return NextResponse.json({ ok: true, bookingId: booking.id, mode: 'test', redirect: '/reservations' })
      }

      const pmRes = await fetch('https://api.paymongo.com/v1/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Basic ${Buffer.from(secretKey + ':').toString('base64')}` },
        body: JSON.stringify({ data: { attributes: {
          amount: amountCentavos, currency: 'PHP', type: 'gcash',
          redirect: { success: `${baseUrl}/reservations?bptl_paid=1`, failed: `${baseUrl}/reserve?error=payment_failed` },
          billing: { name: profile.fullName, email: profile.email },
        }}}),
      })
      const pmData = await pmRes.json()
      if (!pmRes.ok) {
        await db.booking.delete({ where: { id: booking.id } })
        return NextResponse.json({ error: 'Payment initiation failed' }, { status: 502 })
      }
      await db.booking.update({ where: { id: booking.id }, data: { paymentRef: pmData.data.id } })
      return NextResponse.json({ ok: true, bookingId: booking.id, checkoutUrl: pmData.data.attributes.redirect.checkout_url, mode: 'bptl_gcash' })
    }

    if (court?.courtType === 'multipurpose') {
      // Treat like non-member: per-hour rate via GCash
      const rateKey = sportType === 'basketball' ? 'price_per_hour_basketball' : 'price_per_hour_pickleball'
      const rateSetting = await db.appSetting.findUnique({ where: { key: rateKey } })
      const pricePerHour = Number(rateSetting?.value ?? 200)
      const amountPhp = Math.round((durationMinutes / 60) * pricePerHour)
      const amountCentavos = amountPhp * 100
      const qrToken = crypto.randomBytes(16).toString('hex')
      const booking = await db.booking.create({
        data: {
          memberId: profile.id,
          courtId, sportType,
          date: bookingDate,
          startTime,
          endTime,
          durationMinutes,
          status: 'pending_payment',
          paymentStatus: 'pending',
          amountPaid: amountCentavos,
          bookerType: 'bptl',
          qrToken,
        },
      })
      if (!secretKey) {
        return NextResponse.json({ ok: true, bookingId: booking.id, mode: 'test', redirect: '/reservations' })
      }
      const pmRes = await fetch('https://api.paymongo.com/v1/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Basic ${Buffer.from(secretKey + ':').toString('base64')}` },
        body: JSON.stringify({ data: { attributes: {
          amount: amountCentavos, currency: 'PHP', type: 'gcash',
          redirect: { success: `${baseUrl}/reservations?paid=1`, failed: `${baseUrl}/reserve?error=payment_failed` },
          billing: { name: profile.fullName, email: profile.email },
        }}}),
      })
      const pmData = await pmRes.json()
      if (!pmRes.ok) {
        await db.booking.delete({ where: { id: booking.id } })
        return NextResponse.json({ error: 'Payment initiation failed' }, { status: 502 })
      }
      await db.booking.update({ where: { id: booking.id }, data: { paymentRef: pmData.data.id } })
      return NextResponse.json({ ok: true, bookingId: booking.id, checkoutUrl: pmData.data.attributes.redirect.checkout_url, mode: 'bptl_gcash_multi' })
    }
  }
  // ── End BPTL flow ──────────────────────────────────────────────────────────

  const result = await createBookingGroup({
    memberId,
    courtId,
    sportType,
    slots,
    adminOverride,
  })

  return NextResponse.json(result, { status: result.succeeded.length > 0 ? 201 : 422 })
}
