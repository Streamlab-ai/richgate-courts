// GET    /api/admin/members         — list all members
// POST   /api/admin/members         — CSV import
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = request.nextUrl
  const search = searchParams.get('search') ?? ''
  const status = searchParams.get('status') ?? undefined

  const members = await db.profile.findMany({
    where: {
      role: 'member',
      ...(status ? { status } : {}),
      ...(search ? {
        OR: [
          { fullName: { contains: search } },
          { email: { contains: search } },
          { memberId: { contains: search } },
        ],
      } : {}),
    },
    select: {
      id: true, memberId: true, fullName: true, email: true,
      phone: true, role: true, status: true, createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ members })
}
