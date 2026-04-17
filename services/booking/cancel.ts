// ─────────────────────────────────────────────────────────────────────────────
// CANCEL BOOKING
// Cancels a booking and auto-promotes the first waitlisted member.
// ─────────────────────────────────────────────────────────────────────────────

import { db } from '@/lib/db'
import { promoteFromWaitlist } from '@/services/waitlist/promote'
import { sendNotification } from '@/services/notifications'

interface CancelInput {
  bookingId: string
  actorId: string        // who is cancelling (member or admin)
  reason?: string
  adminOverride?: boolean
}

export async function cancelBooking(input: CancelInput): Promise<{ ok: boolean; error?: string }> {
  const { bookingId, actorId, reason, adminOverride } = input

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { court: true, member: true },
  })

  if (!booking) return { ok: false, error: 'Booking not found' }
  if (booking.status === 'cancelled') return { ok: false, error: 'Already cancelled' }

  // Permission: only the owner or an admin may cancel
  if (booking.memberId !== actorId && !adminOverride) {
    return { ok: false, error: 'Permission denied' }
  }

  await db.booking.update({
    where: { id: bookingId },
    data: {
      status: 'cancelled',
      cancelledAt: new Date(),
      cancelReason: reason ?? null,
    },
  })

  // Notify the member
  await sendNotification({
    profileId: booking.memberId ?? booking.id,   // guest bookings have no memberId
    type: 'booking_cancelled',
    subject: `Booking cancelled — ${booking.court.name}`,
    body: `Your ${booking.sportType} booking on ${booking.date} at ${booking.startTime}–${booking.endTime} has been cancelled.${reason ? ` Reason: ${reason}` : ''}`,
  })

  // Promote next person from waitlist for this slot
  await promoteFromWaitlist({
    courtId: booking.courtId,
    sportType: booking.sportType as any,
    date: booking.date,
    startTime: booking.startTime,
    endTime: booking.endTime,
  })

  return { ok: true }
}
