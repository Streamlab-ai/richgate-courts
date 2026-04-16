// ─────────────────────────────────────────────────────────────────────────────
// SLOT GENERATOR
// Produces all bookable time-slots for a given court/date/sportType.
// ─────────────────────────────────────────────────────────────────────────────

import { db } from '@/lib/db'
import type { SlotAvailability, SportType } from './types'
import { timeToMinutes, minutesToTime } from './time-utils'

export async function generateSlots(
  courtId: string,
  sportType: SportType,
  date: string,  // YYYY-MM-DD
): Promise<SlotAvailability[]> {
  const settings = await db.bookingSettings.findUnique({ where: { courtId } })
  if (!settings) return []

  // Blackout date?
  const blackout = await db.blackoutDate.findUnique({
    where: { courtId_date: { courtId, date } },
  })
  if (blackout) {
    return buildSlotGrid(settings.openTimeStart, settings.openTimeEnd, settings.slotDurationMinutes)
      .map(({ startTime, endTime }) => ({
        date, startTime, endTime,
        available: false,
        reason: blackout.reason ?? 'Blackout date',
      }))
  }

  // Past date?
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const bookingDate = new Date(date + 'T00:00:00')
  const diffDays = Math.floor((bookingDate.getTime() - today.getTime()) / 86_400_000)
  if (diffDays < 0) return []

  // Beyond advance-booking horizon?
  if (diffDays > settings.maxAdvanceBookingDays) {
    return buildSlotGrid(settings.openTimeStart, settings.openTimeEnd, settings.slotDurationMinutes)
      .map(({ startTime, endTime }) => ({
        date, startTime, endTime,
        available: false,
        reason: `Bookings open ${settings.maxAdvanceBookingDays} days in advance`,
      }))
  }

  // ── Sport rules check ──────────────────────────────────────────────────────
  // If any active WeeklySportRule exists for this court + sport + dayOfWeek,
  // only the rule's time window is allowed. No rule = unrestricted.
  const dayOfWeek = new Date(date + 'T00:00:00').getDay()
  const sportRules = await db.weeklySportRule.findMany({
    where: { courtId, sportType, dayOfWeek, isActive: true },
  })

  const grid = buildSlotGrid(settings.openTimeStart, settings.openTimeEnd, settings.slotDurationMinutes)
  const results: SlotAvailability[] = []

  // Fetch all confirmed bookings on this court/date once (avoid N+1)
  const existingBookings = await db.booking.findMany({
    where: { courtId, date, status: 'confirmed' },
    select: { startTime: true, endTime: true, sportType: true },
  })

  const pbCapacity = sportType === 'pickleball'
    ? await getPickleballCapacity(courtId)
    : 0

  for (const { startTime, endTime } of grid) {
    // ── Sport rule gate ──────────────────────────────────────────────────────
    // If rules exist, the slot must fall within at least one rule window.
    if (sportRules.length > 0) {
      const inWindow = sportRules.some(r =>
        timeToMinutes(startTime) >= timeToMinutes(r.startTime) &&
        timeToMinutes(endTime)   <= timeToMinutes(r.endTime)
      )
      if (!inWindow) {
        results.push({
          date, startTime, endTime,
          available: false,
          reason: `${sportType} not scheduled at this time`,
        })
        continue
      }
    }

    // ── Conflict check ───────────────────────────────────────────────────────
    const overlapping = existingBookings.filter(b =>
      timesOverlap(b.startTime, b.endTime, startTime, endTime)
    )

    if (sportType === 'tennis' || sportType === 'basketball') {
      const hasConflict = overlapping.length > 0
      results.push({
        date, startTime, endTime,
        available: !hasConflict,
        reason: hasConflict ? 'Slot already booked' : undefined,
      })
    } else {
      // Pickleball
      const basketballOverlap = overlapping.some(b => b.sportType === 'basketball')
      const pbTaken = overlapping.filter(b => b.sportType === 'pickleball').length

      if (basketballOverlap) {
        results.push({
          date, startTime, endTime,
          available: false,
          reason: 'Basketball is booked for this slot',
          pickleballSlotsLeft: 0,
        })
      } else if (pbTaken >= pbCapacity) {
        results.push({
          date, startTime, endTime,
          available: false,
          reason: 'All pickleball slots are full',
          pickleballSlotsLeft: 0,
        })
      } else {
        results.push({
          date, startTime, endTime,
          available: true,
          pickleballSlotsLeft: pbCapacity - pbTaken,
        })
      }
    }
  }

  return results
}

// ─────────────────────────────────────────────────────────────────────────────
// Build a regular time-slot grid between openStart and openEnd
// ─────────────────────────────────────────────────────────────────────────────
export function buildSlotGrid(
  openStart: string,
  openEnd: string,
  durationMinutes: number,
): Array<{ startTime: string; endTime: string }> {
  const slots: Array<{ startTime: string; endTime: string }> = []
  let current = timeToMinutes(openStart)
  const end = timeToMinutes(openEnd)
  while (current + durationMinutes <= end) {
    slots.push({ startTime: minutesToTime(current), endTime: minutesToTime(current + durationMinutes) })
    current += durationMinutes
  }
  return slots
}

async function getPickleballCapacity(courtId: string): Promise<number> {
  const unit = await db.reservableUnit.findFirst({ where: { courtId, sportType: 'pickleball' } })
  return unit?.capacity ?? 3
}

// Returns true if [s1,e1) overlaps [s2,e2)
export function timesOverlap(s1: string, e1: string, s2: string, e2: string): boolean {
  return timeToMinutes(s1) < timeToMinutes(e2) && timeToMinutes(e1) > timeToMinutes(s2)
}
