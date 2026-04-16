// GET  /api/bookings        — member's own bookings
// POST /api/bookings        — create multi-slot booking
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { createBookingGroup } from '@/services/booking/create-booking-group'
import type { SportType, TimeSlot } from '@/services/booking/types'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const bookings = await db.booking.findMany({
    where: { memberId: session.sub },
    include: { court: { select: { name: true, courtType: true } } },
    orderBy: [{ date: 'desc' }, { startTime: 'desc' }],
  })

  return NextResponse.json({ bookings })
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { courtId, sportType, slots, memberId: bodyMemberId, adminOverride: bodyAdminOverride } = body as {
    courtId: string
    sportType: SportType
    slots: TimeSlot[]
    memberId?: string
    adminOverride?: boolean
  }

  if (!courtId || !sportType || !Array.isArray(slots) || slots.length === 0) {
    return NextResponse.json({ error: 'courtId, sportType, and slots[] are required' }, { status: 400 })
  }

  // Admin can override member requirement and set adminOverride flag
  const isAdmin = session.role === 'admin'
  const memberId = isAdmin ? (bodyMemberId || session.sub) : session.sub
  const adminOverride = isAdmin ? (bodyAdminOverride ?? false) : false

  // Non-admin members must be active
  if (!isAdmin && session.status !== 'active') {
    return NextResponse.json({ error: 'Account is not active' }, { status: 403 })
  }

  const result = await createBookingGroup({
    memberId,
    courtId,
    sportType,
    slots,
    adminOverride,
  })

  return NextResponse.json(result, { status: result.succeeded.length > 0 ? 201 : 422 })
}
