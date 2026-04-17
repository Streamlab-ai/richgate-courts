// GET /api/slots?courtId=&sportType=&date=
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { generateSlots } from '@/services/booking/generate-slots'
import type { SportType } from '@/services/booking/types'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const courtId   = searchParams.get('courtId')
  const sportType = searchParams.get('sportType') as SportType | null
  const date      = searchParams.get('date')

  if (!courtId || !sportType || !date) {
    return NextResponse.json({ error: 'courtId, sportType, and date are required' }, { status: 400 })
  }

  const profile = await db.profile.findUnique({ where: { id: session.sub }, select: { role: true } })
  const callerMemberType = (profile?.role ?? 'hoa') as 'hoa' | 'bptl'
  const slots = await generateSlots(courtId, sportType, date, callerMemberType)
  return NextResponse.json({ slots })
}
