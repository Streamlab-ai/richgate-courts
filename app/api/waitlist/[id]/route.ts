import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { leaveWaitlist } from '@/services/waitlist/leave'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const result = await leaveWaitlist(id, session.sub)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ ok: true })
}
