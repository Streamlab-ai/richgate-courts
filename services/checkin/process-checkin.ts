// ─────────────────────────────────────────────────────────────────────────────
// PROCESS CHECK-IN
// Validates token, enforces time window, prevents duplicate check-ins.
// ─────────────────────────────────────────────────────────────────────────────

import { db } from '@/lib/db'
import { toDateTime } from '@/services/booking/time-utils'

// Allow check-in N minutes before/after slot start
const CHECKIN_WINDOW_BEFORE_MINUTES = 15
const CHECKIN_WINDOW_AFTER_MINUTES  = 30

interface CheckinInput {
  qrToken: string
  actorId?: string   // admin doing manual check-in
  method?: 'qr' | 'manual'
}

interface CheckinResult {
  ok: boolean
  bookingId?: string
  memberName?: string
  error?: string
}

export async function processCheckin(input: CheckinInput): Promise<CheckinResult> {
  const { qrToken, actorId, method = 'qr' } = input

  const booking = await db.booking.findUnique({
    where: { qrToken },
    include: { member: true, court: true },
  })

  if (!booking) return { ok: false, error: 'Invalid QR token' }
  if (booking.status !== 'confirmed') {
    return { ok: false, error: `Booking is ${booking.status}, not confirmed` }
  }

  // Time window check
  const now = new Date()
  const slotStart = toDateTime(booking.date, booking.startTime)
  const slotEnd   = toDateTime(booking.date, booking.endTime)
  const windowStart = new Date(slotStart.getTime() - CHECKIN_WINDOW_BEFORE_MINUTES * 60_000)
  const windowEnd   = new Date(slotStart.getTime() + CHECKIN_WINDOW_AFTER_MINUTES * 60_000)

  if (now < windowStart) {
    const minsUntil = Math.ceil((windowStart.getTime() - now.getTime()) / 60_000)
    return { ok: false, error: `Check-in opens ${minsUntil} min before your slot` }
  }
  if (now > slotEnd) {
    return { ok: false, error: 'Slot has already ended' }
  }
  if (now > windowEnd) {
    return { ok: false, error: 'Check-in window has closed (too late)' }
  }

  // Duplicate check
  const existing = await db.checkinEvent.findFirst({ where: { bookingId: booking.id } })
  if (existing) {
    return { ok: false, error: 'Already checked in' }
  }

  // Record check-in
  await db.checkinEvent.create({
    data: {
      bookingId: booking.id,
      memberId: booking.memberId ?? booking.id,  // guest fallback
      checkedInAt: now,
      checkedInBy: actorId ?? null,
      method,
    },
  })

  // Update booking status
  await db.booking.update({
    where: { id: booking.id },
    data: { status: 'completed' },
  })

  return {
    ok: true,
    bookingId: booking.id,
    memberName: booking.member?.fullName ?? booking.guestName ?? 'Guest',
  }
}
