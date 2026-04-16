// POST /api/checkin  — validate QR token and record check-in
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { processCheckin } from '@/services/checkin/process-checkin'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { qrToken } = body

  if (!qrToken) return NextResponse.json({ error: 'qrToken is required' }, { status: 400 })

  const result = await processCheckin({
    qrToken,
    actorId: session.role === 'admin' ? session.sub : undefined,
    method: session.role === 'admin' ? 'manual' : 'qr',
  })

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json(result)
}
