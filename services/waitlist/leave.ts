// ─────────────────────────────────────────────────────────────────────────────
// LEAVE WAITLIST
// ─────────────────────────────────────────────────────────────────────────────

import { db } from '@/lib/db'

export async function leaveWaitlist(
  entryId: string,
  memberId: string,
): Promise<{ ok: boolean; error?: string }> {
  const entry = await db.waitlistEntry.findUnique({ where: { id: entryId } })
  if (!entry) return { ok: false, error: 'Waitlist entry not found' }
  if (entry.memberId !== memberId) return { ok: false, error: 'Permission denied' }
  if (entry.status !== 'waiting') return { ok: false, error: 'Entry is no longer active' }

  await db.waitlistEntry.update({
    where: { id: entryId },
    data: { status: 'expired' },
  })

  // Re-number remaining entries so positions stay contiguous
  const remaining = await db.waitlistEntry.findMany({
    where: {
      courtId: entry.courtId,
      sportType: entry.sportType,
      date: entry.date,
      startTime: entry.startTime,
      endTime: entry.endTime,
      status: 'waiting',
    },
    orderBy: { position: 'asc' },
  })
  for (let i = 0; i < remaining.length; i++) {
    await db.waitlistEntry.update({ where: { id: remaining[i].id }, data: { position: i + 1 } })
  }

  return { ok: true }
}
