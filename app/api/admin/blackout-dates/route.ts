// GET    /api/admin/blackout-dates?courtId=   — list blackout dates
// POST   /api/admin/blackout-dates             — add a blackout date
// DELETE /api/admin/blackout-dates             — remove a blackout date
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = request.nextUrl
  const courtId = searchParams.get('courtId') ?? undefined

  const blackouts = await db.blackoutDate.findMany({
    where: { ...(courtId ? { courtId } : {}) },
    include: { court: { select: { name: true } } },
    orderBy: { date: 'asc' },
  })

  return NextResponse.json({ blackouts })
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { courtId, date, reason } = body

  if (!courtId || !date) return NextResponse.json({ error: 'courtId and date are required' }, { status: 400 })

  // Validate YYYY-MM-DD format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: 'date must be YYYY-MM-DD' }, { status: 400 })

  try {
    const blackout = await db.blackoutDate.create({
      data: { courtId, date, reason: reason ?? null },
    })
    return NextResponse.json({ ok: true, blackout }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Date already blacked out for this court' }, { status: 409 })
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { id } = body

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  await db.blackoutDate.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
