import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const courts = await db.court.findMany({
    where: { isActive: true },
    include: { bookingSettings: true },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json({ courts })
}
