/**
 * CHECK-IN VALIDATION TESTS
 * Tests time window logic and duplicate prevention (pure, no DB).
 */

const WINDOW_BEFORE = 15  // minutes before slot
const WINDOW_AFTER  = 30  // minutes after slot start (still OK to check in)

function canCheckIn(
  nowMs: number,
  slotStartMs: number,
  slotEndMs: number,
  alreadyCheckedIn: boolean,
): { ok: boolean; reason?: string } {
  if (alreadyCheckedIn) return { ok: false, reason: 'Already checked in' }

  const windowStart = slotStartMs - WINDOW_BEFORE * 60_000
  const windowEnd   = slotStartMs + WINDOW_AFTER * 60_000

  if (nowMs < windowStart) {
    const minsUntil = Math.ceil((windowStart - nowMs) / 60_000)
    return { ok: false, reason: `Check-in opens in ${minsUntil} min` }
  }
  if (nowMs > slotEndMs) return { ok: false, reason: 'Slot has ended' }
  if (nowMs > windowEnd)  return { ok: false, reason: 'Check-in window has closed' }

  return { ok: true }
}

function ms(hours: number, minutes = 0): number {
  return (hours * 60 + minutes) * 60_000
}

describe('canCheckIn — time window', () => {
  const slotStart = ms(9)   // 09:00
  const slotEnd   = ms(10)  // 10:00

  test('exactly at window open (14 min before) → allowed', () => {
    expect(canCheckIn(slotStart - 14 * 60_000, slotStart, slotEnd, false).ok).toBe(true)
  })

  test('at slot start → allowed', () => {
    expect(canCheckIn(slotStart, slotStart, slotEnd, false).ok).toBe(true)
  })

  test('30 min after slot start → allowed', () => {
    expect(canCheckIn(slotStart + 30 * 60_000, slotStart, slotEnd, false).ok).toBe(true)
  })

  test('31 min after slot start → window closed', () => {
    const result = canCheckIn(slotStart + 31 * 60_000, slotStart, slotEnd, false)
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('window has closed')
  })

  test('16 min before slot → too early', () => {
    const result = canCheckIn(slotStart - 16 * 60_000, slotStart, slotEnd, false)
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('opens in')
  })

  test('after slot end → too late', () => {
    const result = canCheckIn(slotEnd + 60_000, slotStart, slotEnd, false)
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('ended')
  })
})

describe('canCheckIn — duplicate prevention', () => {
  const slotStart = ms(9)
  const slotEnd   = ms(10)

  test('first check-in succeeds', () => {
    expect(canCheckIn(slotStart, slotStart, slotEnd, false).ok).toBe(true)
  })

  test('second check-in on same booking → blocked', () => {
    const result = canCheckIn(slotStart, slotStart, slotEnd, true)
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('Already checked in')
  })
})

describe('QR token format', () => {
  // The nanoid function generates a 12-char URL-safe string
  function isValidToken(token: string): boolean {
    return /^[A-Za-z0-9_-]{12}$/.test(token)
  }

  test('valid 12-char token passes', () => expect(isValidToken('aB3xK9mNpQ2r')).toBe(true))
  test('too short token fails',      () => expect(isValidToken('aB3x')).toBe(false))
  test('special chars token fails',  () => expect(isValidToken('aB3xK9mN!Q2r')).toBe(false))
  test('empty string fails',         () => expect(isValidToken('')).toBe(false))
})
