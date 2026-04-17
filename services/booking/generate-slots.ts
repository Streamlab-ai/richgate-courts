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
  callerMemberType: 'hoa' | 'bptl' | 'guest' = 'hoa',
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
  // Fetch ALL active rules for this sport+court (across all days).
  // If any rules exist, this sport has a restricted schedule:
  //   - Days with no matching rule → sport is completely unavailable.
  //   - Days with rules → only the rule's time windows are allowed.
  // If NO rules exist at all → unrestricted (open court hours apply).
  const dayOfWeek = new Date(date + 'T00:00:00').getDay()

  const [todayRules, anyRulesExist] = await Promise.all([
    db.weeklySportRule.findMany({
      where: { courtId, sportType, dayOfWeek, isActive: true },
    }),
    db.weeklySportRule.findFirst({
      where: { courtId, sportType, isActive: true },
      select: { id: true },
    }),
  ])

  const grid = buildSlotGrid(settings.openTimeStart, settings.openTimeEnd, settings.slotDurationMinutes)
  const results: SlotAvailability[] = []

  // If this sport has ANY scheduled rules but NONE for today → fully blocked today
  if (anyRulesExist && todayRules.length === 0) {
    return grid.map(({ startTime, endTime }) => ({
      date, startTime, endTime,
      available: false,
      reason: `${sportType.charAt(0).toUpperCase() + sportType.slice(1)} is not scheduled today`,
    }))
  }

  // Fetch all confirmed bookings on this court/date once (avoid N+1)
  const existingBookings = await db.booking.findMany({
    where: { courtId, date, status: { in: ['confirmed', 'pending_payment'] } },
    select: { startTime: true, endTime: true, sportType: true, bookerType: true },
  })

  const pbCapacity = sportType === 'pickleball'
    ? await getPickleballCapacity(courtId)
    : 0

  for (const { startTime, endTime } of grid) {
    // isBptlSlot is true when this slot falls inside a BPTL-exclusive rule window.
    // Declared here (outer loop scope) so the conflict-check block below can read it.
    let isBptlSlot = false

    // ── Sport rule gate ──────────────────────────────────────────────────────
    if (todayRules.length > 0) {
      const bptlRule = todayRules.find(r =>
        r.bookerType === 'bptl' &&
        timeToMinutes(startTime) >= timeToMinutes(r.startTime) &&
        timeToMinutes(endTime)   <= timeToMinutes(r.endTime)
      )
      const openRule = todayRules.find(r =>
        !r.bookerType &&
        timeToMinutes(startTime) >= timeToMinutes(r.startTime) &&
        timeToMinutes(endTime)   <= timeToMinutes(r.endTime)
      )

      isBptlSlot = !!bptlRule

      if (bptlRule) {
        // BPTL rule covers this slot — always takes precedence over open rules.
        // Guests are blocked; HOA and BPTL members can book.
        if (callerMemberType === 'guest') {
          results.push({ date, startTime, endTime, available: false, reason: 'Members only', isBptlSlot })
          continue
        }
        // HOA/BPTL callers — fall through to conflict check below
      } else if (!openRule) {
        // No rule covers this slot at all
        results.push({
          date, startTime, endTime, available: false,
          reason: `${sportType.charAt(0).toUpperCase() + sportType.slice(1)} not scheduled at this time`,
        })
        continue
      }
      // If openRule found (or both) — all callers proceed to conflict check
    }

    // ── Conflict check ───────────────────────────────────────────────────────
    const overlapping = existingBookings.filter(b =>
      timesOverlap(b.startTime, b.endTime, startTime, endTime)
    )

    if (sportType === 'tennis' || sportType === 'basketball') {
      let hasConflict: boolean
      if (isBptlSlot && callerMemberType === 'bptl') {
        // Unlimited concurrent BPTL — only block if a non-BPTL booking exists
        hasConflict = overlapping.some(b => b.bookerType !== 'bptl')
      } else {
        hasConflict = overlapping.length > 0
      }
      results.push({
        date, startTime, endTime,
        available: !hasConflict,
        reason: hasConflict ? 'Slot already booked' : undefined,
        isBptlSlot,
      })
    } else {
      // Pickleball
      const basketballOverlap = overlapping.some(b => b.sportType === 'basketball')
      const pbTaken = overlapping.filter(b => b.sportType === 'pickleball').length

      if (basketballOverlap) {
        results.push({ date, startTime, endTime, available: false, reason: 'Basketball is booked for this slot', pickleballSlotsLeft: 0, isBptlSlot })
      } else if (pbTaken >= pbCapacity) {
        results.push({ date, startTime, endTime, available: false, reason: 'All pickleball slots are full', pickleballSlotsLeft: 0, isBptlSlot })
      } else {
        results.push({ date, startTime, endTime, available: true, pickleballSlotsLeft: pbCapacity - pbTaken, isBptlSlot })
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
