// POST /api/recurring  — create recurrence series
// GET  /api/recurring  — member's series
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { createRecurrenceSeries } from '@/services/recurring/create-series'
import type { SportType } from '@/services/booking/types'
import type { RecurrenceFrequency } from '@/services/recurring/create-series'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const series = await db.recurrenceSeries.findMany({
    where: (session.role === 'admin' || session.role === 'super_admin') ? {} : { memberId: session.sub },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ series })
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.status !== 'active' && session.role !== 'admin' && session.role !== 'super_admin') {
    return NextResponse.json({ error: 'Account is not active' }, { status: 403 })
  }

  const body = await request.json()
  const {
    courtId, sportType, frequency, customWeekdays,
    startDate, endDate, startTime, endTime,
  } = body

  if (!courtId || !sportType || !frequency || !startDate || !endDate || !startTime || !endTime) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const result = await createRecurrenceSeries({
    memberId: session.sub,
    courtId,
    sportType: sportType as SportType,
    frequency: frequency as RecurrenceFrequency,
    customWeekdays,
    startDate,
    endDate,
    startTime,
    endTime,
    adminOverride: session.role === 'admin' || session.role === 'super_admin',
  })

  return NextResponse.json(result, { status: 201 })
}
