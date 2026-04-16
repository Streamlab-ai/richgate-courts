// GET    /api/admin/sport-rules?courtId=   — list rules for a court
// POST   /api/admin/sport-rules             — add a rule
// DELETE /api/admin/sport-rules             — remove a rule
// PATCH  /api/admin/sport-rules             — toggle isActive
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = request.nextUrl
  const courtId = searchParams.get('courtId') ?? undefined

  const rules = await db.weeklySportRule.findMany({
    where: { ...(courtId ? { courtId } : {}) },
    include: { court: { select: { name: true } } },
    orderBy: [{ dayOfWeek: 'asc' }, { sportType: 'asc' }, { startTime: 'asc' }],
  })

  return NextResponse.json({ rules })
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { courtId, dayOfWeek, sportType, startTime, endTime } = body

  if (!courtId || dayOfWeek === undefined || !sportType || !startTime || !endTime) {
    return NextResponse.json({ error: 'courtId, dayOfWeek, sportType, startTime, endTime are required' }, { status: 400 })
  }

  if (!['basketball', 'pickleball', 'tennis'].includes(sportType)) {
    return NextResponse.json({ error: 'sportType must be basketball, pickleball, or tennis' }, { status: 400 })
  }

  if (dayOfWeek < 0 || dayOfWeek > 6) {
    return NextResponse.json({ error: 'dayOfWeek must be 0 (Sun) – 6 (Sat)' }, { status: 400 })
  }

  const timeRegex = /^\d{2}:\d{2}$/
  if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
    return NextResponse.json({ error: 'startTime and endTime must be HH:MM' }, { status: 400 })
  }

  const rule = await db.weeklySportRule.create({
    data: { courtId, dayOfWeek: Number(dayOfWeek), sportType, startTime, endTime, isActive: true },
  })

  return NextResponse.json({ ok: true, rule }, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { id } = body

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  await db.weeklySportRule.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

export async function PATCH(request: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { id, isActive } = body

  if (!id || isActive === undefined) return NextResponse.json({ error: 'id and isActive are required' }, { status: 400 })

  const rule = await db.weeklySportRule.update({ where: { id }, data: { isActive } })
  return NextResponse.json({ ok: true, rule })
}
