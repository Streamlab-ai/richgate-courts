// ─────────────────────────────────────────────────────────────────────────────
// CREATE RECURRENCE SERIES
// Generates all occurrence dates then attempts to book each one.
// Returns succeeded + failed list (partial success allowed).
// ─────────────────────────────────────────────────────────────────────────────

import { db } from '@/lib/db'
import { createBookingGroup } from '@/services/booking/create-booking-group'
import { addDays } from '@/services/booking/time-utils'
import { sendNotification } from '@/services/notifications'
import type { SportType, TimeSlot } from '@/services/booking/types'

export type RecurrenceFrequency = 'daily' | 'weekly' | 'custom'

interface CreateSeriesInput {
  memberId: string
  courtId: string
  sportType: SportType
  frequency: RecurrenceFrequency
  customWeekdays?: number[]   // 0=Sun … 6=Sat (for 'custom')
  startDate: string           // YYYY-MM-DD
  endDate: string
  startTime: string           // HH:MM
  endTime: string
  adminOverride?: boolean
}

interface RecurrenceResult {
  seriesId: string
  succeeded: Array<{ date: string; bookingId: string }>
  failed: Array<{ date: string; reason: string }>
}

export async function createRecurrenceSeries(
  input: CreateSeriesInput,
): Promise<RecurrenceResult> {
  const {
    memberId, courtId, sportType, frequency, customWeekdays,
    startDate, endDate, startTime, endTime, adminOverride = false,
  } = input

  // Create the series record first
  const series = await db.recurrenceSeries.create({
    data: {
      memberId, courtId, sportType, frequency,
      customWeekdays: customWeekdays ? JSON.stringify(customWeekdays) : null,
      startDate, endDate, startTime, endTime, status: 'active',
    },
  })

  // Build the list of occurrence dates
  const occurrences = buildOccurrenceDates(frequency, customWeekdays ?? [], startDate, endDate)

  const succeeded: RecurrenceResult['succeeded'] = []
  const failed: RecurrenceResult['failed'] = []

  for (const date of occurrences) {
    const slot: TimeSlot = { date, startTime, endTime }
    const result = await createBookingGroup({
      memberId, courtId, sportType, slots: [slot], adminOverride,
    })

    if (result.succeeded.length > 0) {
      // Link booking to series
      await db.booking.update({
        where: { id: result.succeeded[0].bookingId },
        data: { recurrenceSeriesId: series.id },
      })
      succeeded.push({ date, bookingId: result.succeeded[0].bookingId })
    } else {
      failed.push({ date, reason: result.failed[0]?.reason ?? 'Unknown error' })
    }
  }

  // Send summary notification
  await sendNotification({
    profileId: memberId,
    type: 'recurring_summary',
    subject: 'Recurring booking summary',
    body: `Recurring series created. ✅ ${succeeded.length} booked, ❌ ${failed.length} failed.` +
      (failed.length > 0
        ? `\nFailed dates: ${failed.map(f => `${f.date} (${f.reason})`).join(', ')}`
        : ''),
  })

  return { seriesId: series.id, succeeded, failed }
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function buildOccurrenceDates(
  frequency: RecurrenceFrequency,
  customWeekdays: number[],
  startDate: string,
  endDate: string,
): string[] {
  const dates: string[] = []
  let current = startDate
  const end = endDate

  while (current <= end) {
    const dayOfWeek = new Date(current + 'T00:00:00').getDay()

    if (frequency === 'daily') {
      dates.push(current)
    } else if (frequency === 'weekly') {
      // Same day of week as startDate
      const startDow = new Date(startDate + 'T00:00:00').getDay()
      if (dayOfWeek === startDow) dates.push(current)
    } else if (frequency === 'custom') {
      if (customWeekdays.includes(dayOfWeek)) dates.push(current)
    }

    current = addDays(current, 1)
  }

  return dates
}
