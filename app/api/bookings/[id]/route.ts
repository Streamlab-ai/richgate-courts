// DELETE /api/bookings/[id]  — cancel a booking
// PATCH  /api/bookings/[id]  — admin: mark pending_payment booking as paid (in-person)
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { cancelBooking } from '@/services/booking/cancel'
import { db } from '@/lib/db'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json().catch(() => ({}))

  const result = await cancelBooking({
    bookingId: id,
    actorId: session.sub,
    reason: body?.reason,
    adminOverride: session.role === 'admin' || session.role === 'super_admin',
  })

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session || (session.role !== 'admin' && session.role !== 'super_admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const booking = await db.booking.findUnique({ where: { id }, select: { status: true } })
  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  if (booking.status !== 'pending_payment') {
    return NextResponse.json({ error: 'Only pending_payment bookings can be marked as paid' }, { status: 400 })
  }

  await db.booking.update({
    where: { id },
    data: { status: 'confirmed', paymentStatus: 'paid' },
  })

  return NextResponse.json({ ok: true })
}
