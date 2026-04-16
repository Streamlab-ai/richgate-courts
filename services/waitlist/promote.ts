// ─────────────────────────────────────────────────────────────────────────────
// PROMOTE FROM WAITLIST
// Called automatically when a booking is cancelled.
// Takes the first eligible waiting entry and creates a confirmed booking.
// ─────────────────────────────────────────────────────────────────────────────

import { db } from '@/lib/db'
import { checkConflict } from '@/services/booking/validate'
import { durationMinutes } from '@/services/booking/time-utils'
import { nanoid } from '@/services/booking/nanoid'
import { sendNotification } from '@/services/notifications'
import type { SportType } from '@/services/booking/types'

interface PromoteInput {
  courtId: string
  sportType: SportType
  date: string
  startTime: string
  endTime: string
}

export async function promoteFromWaitlist(input: PromoteInput): Promise<void> {
  const { courtId, sportType, date, startTime, endTime } = input

  // Find the first waiting entry (FIFO by position)
  const entries = await db.waitlistEntry.findMany({
    where: { courtId, sportType, date, startTime, endTime, status: 'waiting' },
    orderBy: { position: 'asc' },
  })

  for (const entry of entries) {
    // Re-check the slot is now actually free
    const conflict = await checkConflict({ courtId, sportType, date, startTime, endTime })
    if (conflict.hasConflict) break  // slot filled by something else

    // Check member is still active
    const member = await db.profile.findUnique({ where: { id: entry.memberId } })
    if (!member || member.status !== 'active') {
      // Skip this entry, try next
      await db.waitlistEntry.update({ where: { id: entry.id }, data: { status: 'expired' } })
      continue
    }

    // Create the booking
    const booking = await db.booking.create({
      data: {
        memberId: entry.memberId,
        courtId,
        sportType,
        date,
        startTime,
        endTime,
        durationMinutes: durationMinutes(startTime, endTime),
        status: 'confirmed',
        qrToken: nanoid(12),
      },
    })

    // Mark waitlist entry as booked
    await db.waitlistEntry.update({
      where: { id: entry.id },
      data: { status: 'booked', bookingId: booking.id, notifiedAt: new Date() },
    })

    // Re-number remaining entries
    const remaining = await db.waitlistEntry.findMany({
      where: { courtId, sportType, date, startTime, endTime, status: 'waiting' },
      orderBy: { position: 'asc' },
    })
    for (let i = 0; i < remaining.length; i++) {
      await db.waitlistEntry.update({ where: { id: remaining[i].id }, data: { position: i + 1 } })
    }

    // Notify the promoted member
    const court = await db.court.findUnique({ where: { id: courtId } })
    await sendNotification({
      profileId: entry.memberId,
      type: 'waitlist_promoted',
      subject: 'Great news — your slot is now available!',
      body: `A slot opened up for ${sportType} on ${date} at ${startTime}–${endTime} at ${court?.name ?? 'the court'}. Your booking is confirmed! QR token: ${booking.qrToken}`,
    })

    break  // only promote one person per cancellation
  }
}
