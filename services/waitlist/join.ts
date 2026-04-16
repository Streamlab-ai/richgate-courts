// ─────────────────────────────────────────────────────────────────────────────
// JOIN WAITLIST
// Adds a member to the FIFO queue for a full slot.
// ─────────────────────────────────────────────────────────────────────────────

import { db } from '@/lib/db'
import { sendNotification } from '@/services/notifications'
import type { SportType } from '@/services/booking/types'

interface JoinWaitlistInput {
  memberId: string
  courtId: string
  sportType: SportType
  date: string
  startTime: string
  endTime: string
}

export async function joinWaitlist(
  input: JoinWaitlistInput,
): Promise<{ ok: boolean; position?: number; error?: string }> {
  const { memberId, courtId, sportType, date, startTime, endTime } = input

  // Check member is active
  const member = await db.profile.findUnique({ where: { id: memberId } })
  if (!member || member.status !== 'active') {
    return { ok: false, error: 'Member is not active' }
  }

  // Already on waitlist for this exact slot?
  const existing = await db.waitlistEntry.findFirst({
    where: { memberId, courtId, sportType, date, startTime, endTime, status: 'waiting' },
  })
  if (existing) {
    return { ok: false, error: 'Already on waitlist for this slot' }
  }

  // Get next position (max position + 1)
  const last = await db.waitlistEntry.findFirst({
    where: { courtId, sportType, date, startTime, endTime, status: 'waiting' },
    orderBy: { position: 'desc' },
  })
  const position = (last?.position ?? 0) + 1

  await db.waitlistEntry.create({
    data: { memberId, courtId, sportType, date, startTime, endTime, position, status: 'waiting' },
  })

  await sendNotification({
    profileId: memberId,
    type: 'waitlist_joined',
    subject: 'Added to waitlist',
    body: `You are #${position} on the waitlist for ${sportType} on ${date} at ${startTime}–${endTime}.`,
  })

  return { ok: true, position }
}
