// ─────────────────────────────────────────────────────────────────────────────
// CREATE BOOKING GROUP
// Books multiple slots in a single session. Returns succeeded + failed list.
// ─────────────────────────────────────────────────────────────────────────────

import { db } from '@/lib/db'
import { nanoid } from './nanoid'
import { checkConflict, validateSportForCourt, checkWeeklyLimit, checkMonthlyLimit, checkSessionLimit } from './validate'
import { durationMinutes } from './time-utils'
import { sendNotification } from '@/services/notifications'
import type { BookingRequest, MultiBookingResult, TimeSlot, SportType } from './types'

export async function createBookingGroup(req: BookingRequest): Promise<MultiBookingResult> {
  const { memberId, courtId, sportType, slots, adminOverride = false } = req

  const result: MultiBookingResult = { succeeded: [], failed: [] }

  // ── Validate member ────────────────────────────────────────────────────────
  const member = await db.profile.findUnique({ where: { id: memberId } })
  if (!member || (member.status !== 'active' && !adminOverride)) {
    slots.forEach(slot =>
      result.failed.push({ slot, reason: 'Member is not active' })
    )
    return result
  }

  // ── Validate court + sport type compatibility ──────────────────────────────
  const court = await db.court.findUnique({ where: { id: courtId } })
  if (!court) {
    slots.forEach(slot => result.failed.push({ slot, reason: 'Court not found' }))
    return result
  }

  const sportCheck = validateSportForCourt(court.courtType, sportType)
  if (!sportCheck.valid) {
    slots.forEach(slot => result.failed.push({ slot, reason: sportCheck.reason! }))
    return result
  }

  // ── Session limit check (total hours in this request) ─────────────────────
  if (!adminOverride) {
    const sessionCheck = await checkSessionLimit(memberId, courtId, slots)
    if (!sessionCheck.allowed) {
      slots.forEach(slot => result.failed.push({ slot, reason: sessionCheck.reason! }))
      return result
    }
  }

  // ── Per-slot processing ────────────────────────────────────────────────────
  for (const slot of slots) {
    const { date, startTime, endTime } = slot
    const slotMinutes = durationMinutes(startTime, endTime)

    // Weekly limit
    if (!adminOverride) {
      const weekCheck = await checkWeeklyLimit(memberId, courtId, date, slotMinutes)
      if (!weekCheck.allowed) {
        result.failed.push({ slot, reason: weekCheck.reason! })
        continue
      }
      // Monthly limit
      const monthCheck = await checkMonthlyLimit(memberId, courtId, date, slotMinutes)
      if (!monthCheck.allowed) {
        result.failed.push({ slot, reason: monthCheck.reason! })
        continue
      }
    }

    // Conflict check
    const conflict = await checkConflict({ courtId, sportType, date, startTime, endTime })
    if (conflict.hasConflict) {
      result.failed.push({ slot, reason: conflict.reason! })
      continue
    }

    // Create booking
    try {
      const booking = await db.booking.create({
        data: {
          memberId,
          courtId,
          sportType,
          date,
          startTime,
          endTime,
          durationMinutes: slotMinutes,
          status: 'confirmed',
          adminOverride,
          qrToken: nanoid(12),
        },
      })
      result.succeeded.push({ slot, bookingId: booking.id })

      // Simulate notification
      await sendNotification({
        profileId: memberId,
        type: 'booking_confirmed',
        subject: `Booking confirmed — ${court.name}`,
        body: `Your ${sportType} booking on ${date} at ${startTime}–${endTime} is confirmed. QR token: ${booking.qrToken}`,
      })
    } catch (err) {
      result.failed.push({ slot, reason: 'Database error while creating booking' })
    }
  }

  return result
}
