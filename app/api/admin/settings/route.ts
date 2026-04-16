// GET  /api/admin/settings          — all courts + their settings
// PATCH /api/admin/settings          — update settings for one court
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const courts = await db.court.findMany({
    include: { bookingSettings: true },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json({ courts })
}

export async function PATCH(request: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const {
    courtId,
    openTimeStart,
    openTimeEnd,
    slotDurationMinutes,
    maxAdvanceBookingDays,
    maxSessionHours,
    maxWeeklyHours,
    maxMonthlyHours,
  } = body

  if (!courtId) return NextResponse.json({ error: 'courtId is required' }, { status: 400 })

  // Validate times
  const timeRegex = /^\d{2}:\d{2}$/
  if (openTimeStart && !timeRegex.test(openTimeStart)) return NextResponse.json({ error: 'Invalid openTimeStart format (HH:MM)' }, { status: 400 })
  if (openTimeEnd   && !timeRegex.test(openTimeEnd))   return NextResponse.json({ error: 'Invalid openTimeEnd format (HH:MM)'   }, { status: 400 })

  const settings = await db.bookingSettings.upsert({
    where: { courtId },
    update: {
      ...(openTimeStart         !== undefined ? { openTimeStart }         : {}),
      ...(openTimeEnd           !== undefined ? { openTimeEnd }           : {}),
      ...(slotDurationMinutes   !== undefined ? { slotDurationMinutes: Number(slotDurationMinutes) }   : {}),
      ...(maxAdvanceBookingDays !== undefined ? { maxAdvanceBookingDays: Number(maxAdvanceBookingDays) } : {}),
      ...(maxSessionHours       !== undefined ? { maxSessionHours: Number(maxSessionHours) }       : {}),
      ...(maxWeeklyHours        !== undefined ? { maxWeeklyHours: Number(maxWeeklyHours) }        : {}),
      ...(maxMonthlyHours       !== undefined ? { maxMonthlyHours: Number(maxMonthlyHours) }       : {}),
    },
    create: {
      courtId,
      openTimeStart:         openTimeStart         ?? '06:00',
      openTimeEnd:           openTimeEnd           ?? '22:00',
      slotDurationMinutes:   slotDurationMinutes   ?? 60,
      maxAdvanceBookingDays: maxAdvanceBookingDays ?? 7,
      maxSessionHours:       maxSessionHours       ?? 2,
      maxWeeklyHours:        maxWeeklyHours        ?? 6,
      maxMonthlyHours:       maxMonthlyHours       ?? 20,
    },
  })

  return NextResponse.json({ ok: true, settings })
}
