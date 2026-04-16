// DELETE /api/bookings/[id]  — cancel a booking
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { cancelBooking } from '@/services/booking/cancel'

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
    adminOverride: session.role === 'admin',
  })

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ ok: true })
}
