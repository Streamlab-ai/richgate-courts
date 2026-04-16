// ─────────────────────────────────────────────────────────────────────────────
// BOOKING VALIDATOR
// All server-side rules: conflicts, sport rules, usage limits.
// ─────────────────────────────────────────────────────────────────────────────

import { db } from '@/lib/db'
import { timesOverlap, durationMinutes, getWeekRange, getMonthRange } from './time-utils'
import type { ConflictCheckResult, LimitCheckResult, SportType } from './types'

// ─── 1. CONFLICT DETECTION ────────────────────────────────────────────────────

interface ConflictInput {
  courtId: string
  sportType: SportType
  date: string
  startTime: string
  endTime: string
  excludeBookingId?: string   // for updates
}

export async function checkConflict(input: ConflictInput): Promise<ConflictCheckResult> {
  const { courtId, sportType, date, startTime, endTime, excludeBookingId } = input

  const existing = await db.booking.findMany({
    where: {
      courtId,
      date,
      status: 'confirmed',
      ...(excludeBookingId ? { NOT: { id: excludeBookingId } } : {}),
    },
    select: { id: true, startTime: true, endTime: true, sportType: true },
  })

  const overlapping = existing.filter(b =>
    timesOverlap(b.startTime, b.endTime, startTime, endTime)
  )

  if (overlapping.length === 0) return { hasConflict: false }

  if (sportType === 'tennis') {
    // Tennis court is exclusive — any overlap = conflict
    return { hasConflict: true, reason: 'Tennis court is already booked for this time' }
  }

  if (sportType === 'basketball') {
    // Basketball requires the entire multipurpose court — any overlap = conflict
    return { hasConflict: true, reason: 'Court is not fully available for basketball' }
  }

  if (sportType === 'pickleball') {
    // Pickleball cannot overlap with basketball
    const basketballConflict = overlapping.some(b => b.sportType === 'basketball')
    if (basketballConflict) {
      return { hasConflict: true, reason: 'Basketball is already booked for this time' }
    }

    // Count how many pickleball bookings already overlap
    const pbOverlap = overlapping.filter(b => b.sportType === 'pickleball').length
    const pbCapacity = await getPickleballCapacity(courtId)
    if (pbOverlap >= pbCapacity) {
      return { hasConflict: true, reason: `All ${pbCapacity} pickleball slots are taken` }
    }

    return { hasConflict: false }
  }

  return { hasConflict: true, reason: 'Unknown sport type conflict' }
}

// ─── 2. SPORT-TYPE ↔ COURT-TYPE VALIDATION ────────────────────────────────────

export function validateSportForCourt(
  courtType: string,
  sportType: SportType,
): { valid: boolean; reason?: string } {
  if (courtType === 'tennis' && sportType !== 'tennis') {
    return { valid: false, reason: 'Tennis court only supports tennis' }
  }
  if (courtType === 'multipurpose' && sportType === 'tennis') {
    return { valid: false, reason: 'Multipurpose court does not support tennis' }
  }
  return { valid: true }
}

// ─── 3. USAGE-LIMIT CHECKS ────────────────────────────────────────────────────

export async function checkSessionLimit(
  memberId: string,
  courtId: string,
  slotsToBook: Array<{ startTime: string; endTime: string }>,
): Promise<LimitCheckResult> {
  const settings = await db.bookingSettings.findUnique({ where: { courtId } })
  if (!settings) return { allowed: true }

  const maxSessionMinutes = settings.maxSessionHours * 60
  const requestedMinutes = slotsToBook.reduce(
    (acc, s) => acc + durationMinutes(s.startTime, s.endTime), 0
  )

  if (requestedMinutes > maxSessionMinutes) {
    return {
      allowed: false,
      reason: `Session exceeds ${settings.maxSessionHours}h limit (requested ${requestedMinutes / 60}h)`,
    }
  }
  return { allowed: true }
}

export async function checkWeeklyLimit(
  memberId: string,
  courtId: string,
  date: string,
  requestedMinutes: number,
): Promise<LimitCheckResult> {
  const settings = await db.bookingSettings.findUnique({ where: { courtId } })
  if (!settings) return { allowed: true }

  const { weekStart, weekEnd } = getWeekRange(date)
  const weekBookings = await db.booking.findMany({
    where: {
      memberId,
      courtId,
      status: 'confirmed',
      date: { gte: weekStart, lte: weekEnd },
    },
    select: { durationMinutes: true },
  })

  const usedMinutes = weekBookings.reduce((acc, b) => acc + b.durationMinutes, 0)
  const maxWeeklyMinutes = settings.maxWeeklyHours * 60

  if (usedMinutes + requestedMinutes > maxWeeklyMinutes) {
    return {
      allowed: false,
      reason: `Weekly limit of ${settings.maxWeeklyHours}h would be exceeded`,
    }
  }
  return { allowed: true }
}

export async function checkMonthlyLimit(
  memberId: string,
  courtId: string,
  date: string,
  requestedMinutes: number,
): Promise<LimitCheckResult> {
  const settings = await db.bookingSettings.findUnique({ where: { courtId } })
  if (!settings) return { allowed: true }

  const { monthStart, monthEnd } = getMonthRange(date)
  const monthBookings = await db.booking.findMany({
    where: {
      memberId,
      courtId,
      status: 'confirmed',
      date: { gte: monthStart, lte: monthEnd },
    },
    select: { durationMinutes: true },
  })

  const usedMinutes = monthBookings.reduce((acc, b) => acc + b.durationMinutes, 0)
  const maxMonthlyMinutes = settings.maxMonthlyHours * 60

  if (usedMinutes + requestedMinutes > maxMonthlyMinutes) {
    return {
      allowed: false,
      reason: `Monthly limit of ${settings.maxMonthlyHours}h would be exceeded`,
    }
  }
  return { allowed: true }
}

// ─── helpers ──────────────────────────────────────────────────────────────────

async function getPickleballCapacity(courtId: string): Promise<number> {
  const unit = await db.reservableUnit.findFirst({ where: { courtId, sportType: 'pickleball' } })
  return unit?.capacity ?? 3
}
