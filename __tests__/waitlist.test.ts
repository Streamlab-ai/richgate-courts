/**
 * WAITLIST LOGIC TESTS
 * Tests FIFO queue positioning and promotion simulation (pure logic, no DB).
 */

describe('Waitlist queue positioning', () => {
  interface WaitlistEntry { id: string; position: number; status: 'waiting' | 'expired' | 'booked' }

  function getNextPosition(entries: WaitlistEntry[]): number {
    const waiting = entries.filter(e => e.status === 'waiting')
    if (waiting.length === 0) return 1
    return Math.max(...waiting.map(e => e.position)) + 1
  }

  function reorderAfterRemoval(entries: WaitlistEntry[], removedId: string): WaitlistEntry[] {
    const updated = entries.map(e => e.id === removedId ? { ...e, status: 'expired' as const } : e)
    const waiting = updated.filter(e => e.status === 'waiting').sort((a, b) => a.position - b.position)
    waiting.forEach((e, i) => { e.position = i + 1 })
    return updated
  }

  test('first entry gets position 1', () => {
    expect(getNextPosition([])).toBe(1)
  })

  test('second entry gets position 2', () => {
    const entries: WaitlistEntry[] = [{ id: 'a', position: 1, status: 'waiting' }]
    expect(getNextPosition(entries)).toBe(2)
  })

  test('third entry gets position 3', () => {
    const entries: WaitlistEntry[] = [
      { id: 'a', position: 1, status: 'waiting' },
      { id: 'b', position: 2, status: 'waiting' },
    ]
    expect(getNextPosition(entries)).toBe(3)
  })

  test('positions re-number after entry leaves', () => {
    const entries: WaitlistEntry[] = [
      { id: 'a', position: 1, status: 'waiting' },
      { id: 'b', position: 2, status: 'waiting' },
      { id: 'c', position: 3, status: 'waiting' },
    ]
    const updated = reorderAfterRemoval(entries, 'a')
    const waiting = updated.filter(e => e.status === 'waiting').sort((a, b) => a.position - b.position)
    expect(waiting.map(e => e.id)).toEqual(['b', 'c'])
    expect(waiting.map(e => e.position)).toEqual([1, 2])
  })

  test('promoted entry becomes "booked", rest shift up', () => {
    const entries: WaitlistEntry[] = [
      { id: 'a', position: 1, status: 'waiting' },
      { id: 'b', position: 2, status: 'waiting' },
      { id: 'c', position: 3, status: 'waiting' },
    ]
    // Simulate promotion of first entry
    entries[0].status = 'booked'
    const waiting = entries.filter(e => e.status === 'waiting').sort((a, b) => a.position - b.position)
    waiting.forEach((e, i) => { e.position = i + 1 })

    expect(entries[0].status).toBe('booked')
    expect(waiting[0].id).toBe('b')
    expect(waiting[0].position).toBe(1)
    expect(waiting[1].id).toBe('c')
    expect(waiting[1].position).toBe(2)
  })
})

describe('Waitlist promotion eligibility', () => {
  function canPromote(memberStatus: string): boolean {
    return memberStatus === 'active'
  }

  test('active member can be promoted', () => expect(canPromote('active')).toBe(true))
  test('pending member cannot be promoted', () => expect(canPromote('pending')).toBe(false))
  test('suspended member cannot be promoted', () => expect(canPromote('suspended')).toBe(false))
  test('rejected member cannot be promoted', () => expect(canPromote('rejected')).toBe(false))
})
