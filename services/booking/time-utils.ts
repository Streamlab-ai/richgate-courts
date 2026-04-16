// ─────────────────────────────────────────────────────────────────────────────
// TIME UTILITIES  — pure functions, zero dependencies
// ─────────────────────────────────────────────────────────────────────────────

/** Convert "HH:MM" → total minutes from midnight */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

/** Convert total minutes from midnight → "HH:MM" */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0')
  const m = (minutes % 60).toString().padStart(2, '0')
  return `${h}:${m}`
}

/** Add N minutes to "HH:MM", returns "HH:MM" */
export function addMinutes(time: string, n: number): string {
  return minutesToTime(timeToMinutes(time) + n)
}

/** Duration in minutes between two "HH:MM" strings */
export function durationMinutes(start: string, end: string): number {
  return timeToMinutes(end) - timeToMinutes(start)
}

/** Returns true if [s1,e1) overlaps [s2,e2) */
export function timesOverlap(s1: string, e1: string, s2: string, e2: string): boolean {
  return timeToMinutes(s1) < timeToMinutes(e2) && timeToMinutes(e1) > timeToMinutes(s2)
}

/**
 * Get the week boundaries (Mon–Sun) for a YYYY-MM-DD date string.
 * Returns { weekStart: 'YYYY-MM-DD', weekEnd: 'YYYY-MM-DD' }
 */
export function getWeekRange(dateStr: string): { weekStart: string; weekEnd: string } {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay()                   // 0=Sun … 6=Sat
  const diffToMon = (day === 0 ? -6 : 1 - day)
  const mon = new Date(d)
  mon.setDate(d.getDate() + diffToMon)
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  return { weekStart: toDateStr(mon), weekEnd: toDateStr(sun) }
}

/**
 * Get the month boundaries for a YYYY-MM-DD date string.
 */
export function getMonthRange(dateStr: string): { monthStart: string; monthEnd: string } {
  const d = new Date(dateStr + 'T00:00:00')
  const first = new Date(d.getFullYear(), d.getMonth(), 1)
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  return { monthStart: toDateStr(first), monthEnd: toDateStr(last) }
}

/** Format a Date as 'YYYY-MM-DD' using LOCAL calendar date (avoids UTC offset drift) */
function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Add N days to a YYYY-MM-DD string */
export function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return toDateStr(d)
}

/** Today as YYYY-MM-DD */
export function today(): string {
  return toDateStr(new Date())
}

/** Parse "HH:MM" inside a booking's date to a JS Date for window checking */
export function toDateTime(dateStr: string, timeStr: string): Date {
  return new Date(`${dateStr}T${timeStr}:00`)
}
