// ─────────────────────────────────────────────────────────────────────────────
// CANCEL RECURRENCE SERIES
// scope: 'single'  — cancel just one booking in the series
//        'forward' — cancel this booking and all future ones in the series
//        'all'     — cancel the entire series
// ─────────────────────────────────────────────────────────────────────────────

import { db } from '@/lib/db'
import { cancelBooking } from '@/services/booking/cancel'

type CancelScope = 'single' | 'forward' | 'all'

interface CancelSeriesInput {
  seriesId: string
  actorId: string
  scope: CancelScope
  fromDate?: string   // required for 'forward'
  reason?: string
  adminOverride?: boolean
}

export async function cancelRecurrenceSeries(
  input: CancelSeriesInput,
): Promise<{ cancelled: number; errors: string[] }> {
  const { seriesId, actorId, scope, fromDate, reason, adminOverride } = input
  const errors: string[] = []
  let cancelled = 0

  const series = await db.recurrenceSeries.findUnique({ where: { id: seriesId } })
  if (!series) return { cancelled: 0, errors: ['Series not found'] }

  // Fetch the relevant bookings
  let where: any = { recurrenceSeriesId: seriesId, status: 'confirmed' }
  if (scope === 'forward' && fromDate) {
    where.date = { gte: fromDate }
  }

  const bookings = await db.booking.findMany({ where, orderBy: { date: 'asc' } })

  for (const booking of bookings) {
    const result = await cancelBooking({
      bookingId: booking.id,
      actorId,
      reason: reason ?? `Series cancellation (${scope})`,
      adminOverride,
    })
    if (result.ok) {
      cancelled++
    } else {
      errors.push(`${booking.date}: ${result.error}`)
    }
  }

  // Mark series as cancelled if all/forward
  if (scope === 'all' || (scope === 'forward' && !fromDate)) {
    await db.recurrenceSeries.update({ where: { id: seriesId }, data: { status: 'cancelled' } })
  }

  return { cancelled, errors }
}
