// GET  /api/waitlist        — member's waitlist entries
// POST /api/waitlist        — join waitlist
// DELETE /api/waitlist/[id] — leave waitlist
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { joinWaitlist } from '@/services/waitlist/join'
import type { SportType } from '@/services/booking/types'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const entries = await db.waitlistEntry.findMany({
    where: { memberId: session.sub, status: 'waiting' },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({ entries })
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { courtId, sportType, date, startTime, endTime } = body

  if (!courtId || !sportType || !date || !startTime || !endTime) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const result = await joinWaitlist({
    memberId: session.sub,
    courtId,
    sportType: sportType as SportType,
    date,
    startTime,
    endTime,
  })

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json(result, { status: 201 })
}
