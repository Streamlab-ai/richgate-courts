/**
 * RECURRING BOOKING TESTS
 * Tests occurrence date generation logic (pure, no DB).
 */

import { addDays } from '../services/booking/time-utils'

type Frequency = 'daily' | 'weekly' | 'custom'

function buildOccurrenceDates(
  frequency: Frequency,
  customWeekdays: number[],
  startDate: string,
  endDate: string,
): string[] {
  const dates: string[] = []
  let current = startDate

  while (current <= endDate) {
    const dayOfWeek = new Date(current + 'T00:00:00').getDay()
    if (frequency === 'daily') {
      dates.push(current)
    } else if (frequency === 'weekly') {
      const startDow = new Date(startDate + 'T00:00:00').getDay()
      if (dayOfWeek === startDow) dates.push(current)
    } else if (frequency === 'custom') {
      if (customWeekdays.includes(dayOfWeek)) dates.push(current)
    }
    current = addDays(current, 1)
  }
  return dates
}

describe('buildOccurrenceDates — daily', () => {
  test('daily for 3 days → 3 dates', () => {
    const dates = buildOccurrenceDates('daily', [], '2025-04-07', '2025-04-09')
    expect(dates).toEqual(['2025-04-07', '2025-04-08', '2025-04-09'])
  })

  test('daily for 1 day → 1 date', () => {
    expect(buildOccurrenceDates('daily', [], '2025-04-07', '2025-04-07')).toHaveLength(1)
  })
})

describe('buildOccurrenceDates — weekly', () => {
  test('weekly Mon from 2025-04-07 for 3 weeks → 3 Mondays', () => {
    const dates = buildOccurrenceDates('weekly', [], '2025-04-07', '2025-04-21')
    expect(dates).toHaveLength(3)
    dates.forEach(d => expect(new Date(d + 'T00:00:00').getDay()).toBe(1)) // Monday=1
  })

  test('weekly for 2 months → ~8-9 occurrences', () => {
    const dates = buildOccurrenceDates('weekly', [], '2025-04-07', '2025-06-07')
    expect(dates.length).toBeGreaterThanOrEqual(8)
    expect(dates.length).toBeLessThanOrEqual(10)
  })
})

describe('buildOccurrenceDates — custom weekdays', () => {
  test('Mon+Wed+Fri for 1 week → 3 dates', () => {
    // 2025-04-07 = Mon, 2025-04-09 = Wed, 2025-04-11 = Fri
    const dates = buildOccurrenceDates('custom', [1, 3, 5], '2025-04-07', '2025-04-13')
    expect(dates).toEqual(['2025-04-07', '2025-04-09', '2025-04-11'])
  })

  test('Tue+Thu for 1 week → 2 dates', () => {
    const dates = buildOccurrenceDates('custom', [2, 4], '2025-04-07', '2025-04-13')
    expect(dates).toEqual(['2025-04-08', '2025-04-10'])
  })

  test('no matching weekdays → empty', () => {
    // Weekdays 0 = Sunday, but range is Mon–Fri
    const dates = buildOccurrenceDates('custom', [0], '2025-04-07', '2025-04-11')
    expect(dates).toHaveLength(0)
  })
})

describe('Partial success handling', () => {
  interface OccurrenceResult {
    date: string
    success: boolean
    bookingId?: string
    reason?: string
  }

  function summarise(results: OccurrenceResult[]) {
    return {
      succeeded: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
    }
  }

  test('all succeed', () => {
    const results: OccurrenceResult[] = [
      { date: '2025-04-07', success: true, bookingId: 'abc' },
      { date: '2025-04-14', success: true, bookingId: 'def' },
    ]
    expect(summarise(results)).toEqual({ succeeded: 2, failed: 0 })
  })

  test('some fail → partial success reported', () => {
    const results: OccurrenceResult[] = [
      { date: '2025-04-07', success: true, bookingId: 'abc' },
      { date: '2025-04-14', success: false, reason: 'Slot already taken' },
    ]
    expect(summarise(results)).toEqual({ succeeded: 1, failed: 1 })
  })

  test('all fail', () => {
    const results: OccurrenceResult[] = [
      { date: '2025-04-07', success: false, reason: 'Slot full' },
      { date: '2025-04-14', success: false, reason: 'Blackout date' },
    ]
    expect(summarise(results)).toEqual({ succeeded: 0, failed: 2 })
  })
})
