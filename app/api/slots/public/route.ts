// GET /api/slots/public?courtId=&sportType=&date=
// Same as /api/slots but no auth required — used by the guest booking page.
import { NextRequest, NextResponse } from 'next/server'
import { generateSlots } from '@/services/booking/generate-slots'
import type { SportType } from '@/services/booking/types'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const courtId   = searchParams.get('courtId')
  const sportType = searchParams.get('sportType') as SportType | null
  const date      = searchParams.get('date')

  if (!courtId || !sportType || !date) {
    return NextResponse.json({ error: 'courtId, sportType, and date are required' }, { status: 400 })
  }

  const slots = await generateSlots(courtId, sportType, date)
  return NextResponse.json({ slots })
}
