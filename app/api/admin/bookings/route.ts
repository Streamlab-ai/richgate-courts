// GET  /api/admin/bookings          — all bookings (filterable)
// POST /api/admin/bookings          — admin creates booking (override limits)
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { createBookingGroup } from '@/services/booking/create-booking-group'
import type { SportType, TimeSlot } from '@/services/booking/types'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = request.nextUrl
  const date    = searchParams.get('date') ?? undefined
  const courtId = searchParams.get('courtId') ?? undefined
  const status  = searchParams.get('status') ?? undefined

  const bookings = await db.booking.findMany({
    where: {
      ...(date    ? { date }    : {}),
      ...(courtId ? { courtId } : {}),
      ...(status  ? { status }  : {}),
    },
    include: {
      member: { select: { fullName: true, memberId: true, email: true } },
      court:  { select: { name: true, courtType: true } },
    },
    orderBy: [{ date: 'desc' }, { startTime: 'asc' }],
  })

  return NextResponse.json({ bookings })
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { memberId, courtId, sportType, slots } = body as {
    memberId: string
    courtId: string
    sportType: SportType
    slots: TimeSlot[]
  }

  if (!memberId || !courtId || !sportType || !slots?.length) {
    return NextResponse.json({ error: 'memberId, courtId, sportType, slots[] required' }, { status: 400 })
  }

  const result = await createBookingGroup({ memberId, courtId, sportType, slots, adminOverride: true })
  return NextResponse.json(result, { status: 201 })
}
