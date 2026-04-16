/**
 * BOOKING ENGINE TESTS
 * Pure unit tests — no database, no network.
 * Tests: conflict detection, sport rules, time utilities, pickleball capacity.
 */

import {
  timesOverlap,
  buildSlotGrid,
} from '../services/booking/generate-slots'
import { validateSportForCourt } from '../services/booking/validate'
import {
  timeToMinutes,
  minutesToTime,
  durationMinutes,
  getWeekRange,
  getMonthRange,
  addDays,
} from '../services/booking/time-utils'

// ─── Time utilities ───────────────────────────────────────────────────────────

describe('timeToMinutes', () => {
  test('converts "06:00" → 360', () => expect(timeToMinutes('06:00')).toBe(360))
  test('converts "18:30" → 1110', () => expect(timeToMinutes('18:30')).toBe(1110))
  test('converts "00:00" → 0', () => expect(timeToMinutes('00:00')).toBe(0))
  test('converts "23:59" → 1439', () => expect(timeToMinutes('23:59')).toBe(1439))
})

describe('minutesToTime', () => {
  test('converts 360 → "06:00"', () => expect(minutesToTime(360)).toBe('06:00'))
  test('converts 0   → "00:00"', () => expect(minutesToTime(0)).toBe('00:00'))
  test('converts 90  → "01:30"', () => expect(minutesToTime(90)).toBe('01:30'))
})

describe('durationMinutes', () => {
  test('06:00–07:00 = 60 min', () => expect(durationMinutes('06:00', '07:00')).toBe(60))
  test('08:00–09:30 = 90 min', () => expect(durationMinutes('08:00', '09:30')).toBe(90))
})

describe('getWeekRange', () => {
  test('2025-04-09 (Wed) → Mon 2025-04-07 to Sun 2025-04-13', () => {
    const { weekStart, weekEnd } = getWeekRange('2025-04-09')
    expect(weekStart).toBe('2025-04-07')
    expect(weekEnd).toBe('2025-04-13')
  })
  test('2025-04-07 (Mon) is its own week start', () => {
    expect(getWeekRange('2025-04-07').weekStart).toBe('2025-04-07')
  })
})

describe('getMonthRange', () => {
  test('2025-04-15 → 2025-04-01 to 2025-04-30', () => {
    const { monthStart, monthEnd } = getMonthRange('2025-04-15')
    expect(monthStart).toBe('2025-04-01')
    expect(monthEnd).toBe('2025-04-30')
  })
  test('2025-02-15 → Feb end is 2025-02-28', () => {
    expect(getMonthRange('2025-02-15').monthEnd).toBe('2025-02-28')
  })
})

describe('addDays', () => {
  test('adds 1 day', () => expect(addDays('2025-04-09', 1)).toBe('2025-04-10'))
  test('crosses month boundary', () => expect(addDays('2025-04-30', 1)).toBe('2025-05-01'))
})

// ─── timesOverlap ─────────────────────────────────────────────────────────────

describe('timesOverlap', () => {
  // True cases
  test('identical slots overlap', () =>
    expect(timesOverlap('08:00', '09:00', '08:00', '09:00')).toBe(true))
  test('partial overlap (start inside)', () =>
    expect(timesOverlap('08:00', '09:00', '08:30', '09:30')).toBe(true))
  test('partial overlap (end inside)', () =>
    expect(timesOverlap('08:30', '09:30', '08:00', '09:00')).toBe(true))
  test('one fully contains the other', () =>
    expect(timesOverlap('08:00', '10:00', '08:30', '09:30')).toBe(true))

  // False cases
  test('sequential slots do NOT overlap', () =>
    expect(timesOverlap('08:00', '09:00', '09:00', '10:00')).toBe(false))
  test('non-adjacent slots do NOT overlap', () =>
    expect(timesOverlap('08:00', '09:00', '10:00', '11:00')).toBe(false))
  test('reversed non-adjacent do NOT overlap', () =>
    expect(timesOverlap('10:00', '11:00', '08:00', '09:00')).toBe(false))
})

// ─── buildSlotGrid ────────────────────────────────────────────────────────────

describe('buildSlotGrid', () => {
  test('tennis 06:00–18:00 @ 60 min → 12 slots', () => {
    const slots = buildSlotGrid('06:00', '18:00', 60)
    expect(slots).toHaveLength(12)
    expect(slots[0]).toEqual({ startTime: '06:00', endTime: '07:00' })
    expect(slots[11]).toEqual({ startTime: '17:00', endTime: '18:00' })
  })

  test('multipurpose 06:00–22:00 @ 60 min → 16 slots', () => {
    const slots = buildSlotGrid('06:00', '22:00', 60)
    expect(slots).toHaveLength(16)
  })

  test('30-min slots 08:00–10:00 → 4 slots', () => {
    const slots = buildSlotGrid('08:00', '10:00', 30)
    expect(slots).toHaveLength(4)
  })

  test('last slot fits exactly', () => {
    const slots = buildSlotGrid('09:00', '11:00', 60)
    expect(slots[slots.length - 1].endTime).toBe('11:00')
  })
})

// ─── validateSportForCourt ────────────────────────────────────────────────────

describe('validateSportForCourt', () => {
  test('tennis on tennis court → valid', () =>
    expect(validateSportForCourt('tennis', 'tennis').valid).toBe(true))
  test('basketball on tennis court → invalid', () =>
    expect(validateSportForCourt('tennis', 'basketball').valid).toBe(false))
  test('pickleball on tennis court → invalid', () =>
    expect(validateSportForCourt('tennis', 'pickleball').valid).toBe(false))
  test('basketball on multipurpose → valid', () =>
    expect(validateSportForCourt('multipurpose', 'basketball').valid).toBe(true))
  test('pickleball on multipurpose → valid', () =>
    expect(validateSportForCourt('multipurpose', 'pickleball').valid).toBe(true))
  test('tennis on multipurpose → invalid', () =>
    expect(validateSportForCourt('multipurpose', 'tennis').valid).toBe(false))
})

// ─── Pickleball capacity logic (inline) ───────────────────────────────────────

describe('Pickleball capacity simulation', () => {
  const CAPACITY = 3

  function canBook(existingPbCount: number, hasBasketball: boolean): boolean {
    if (hasBasketball) return false
    return existingPbCount < CAPACITY
  }

  test('0 existing PB bookings → can book', () => expect(canBook(0, false)).toBe(true))
  test('1 existing PB booking  → can book', () => expect(canBook(1, false)).toBe(true))
  test('2 existing PB bookings → can book', () => expect(canBook(2, false)).toBe(true))
  test('3 existing PB bookings → FULL',      () => expect(canBook(3, false)).toBe(false))
  test('basketball booked      → blocks PB', () => expect(canBook(0, true)).toBe(false))
  test('basketball + 1 PB is impossible (prevented by engine)', () =>
    // If basketball is booked, PB should have been blocked at booking time.
    // This confirms the logic: basketball locks the entire court.
    expect(canBook(1, true)).toBe(false))
})

// ─── Basketball + Pickleball mutual exclusion ─────────────────────────────────

describe('Basketball / Pickleball mutual exclusion', () => {
  type Booking = { sportType: 'basketball' | 'pickleball'; startTime: string; endTime: string }

  function hasBasketballConflict(
    existing: Booking[],
    sportType: 'basketball' | 'pickleball',
    start: string,
    end: string,
  ): boolean {
    const overlapping = existing.filter(b => timesOverlap(b.startTime, b.endTime, start, end))
    if (sportType === 'pickleball') return overlapping.some(b => b.sportType === 'basketball')
    if (sportType === 'basketball') return overlapping.length > 0
    return false
  }

  test('PB blocked when basketball is in the same slot', () => {
    const existing: Booking[] = [{ sportType: 'basketball', startTime: '09:00', endTime: '10:00' }]
    expect(hasBasketballConflict(existing, 'pickleball', '09:00', '10:00')).toBe(true)
  })

  test('Basketball blocked when PB is in the same slot', () => {
    const existing: Booking[] = [{ sportType: 'pickleball', startTime: '09:00', endTime: '10:00' }]
    expect(hasBasketballConflict(existing, 'basketball', '09:00', '10:00')).toBe(true)
  })

  test('PB allowed when basketball is in a different slot', () => {
    const existing: Booking[] = [{ sportType: 'basketball', startTime: '10:00', endTime: '11:00' }]
    expect(hasBasketballConflict(existing, 'pickleball', '09:00', '10:00')).toBe(false)
  })

  test('Basketball allowed when court is clear', () => {
    expect(hasBasketballConflict([], 'basketball', '09:00', '10:00')).toBe(false)
  })
})
