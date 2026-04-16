// GET    /api/admin/members         — list all members
// POST   /api/admin/members         — create member directly
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

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { fullName, email, phone, password, status } = await request.json()

  if (!fullName || !email || !password) {
    return NextResponse.json({ error: 'fullName, email and password are required' }, { status: 400 })
  }

  const existing = await db.profile.findUnique({ where: { email } })
  if (existing) return NextResponse.json({ error: 'Email already in use' }, { status: 409 })

  // Generate next member ID
  const last = await db.profile.findFirst({
    where: { memberId: { not: null } },
    orderBy: { memberId: 'desc' },
  })
  const nextNum = last?.memberId ? parseInt(last.memberId.replace('RG-', '')) + 1 : 1
  const memberId = `RG-${String(nextNum).padStart(6, '0')}`

  const passwordHash = await bcrypt.hash(password, 12)

  const member = await db.profile.create({
    data: {
      fullName,
      email,
      phone: phone || null,
      passwordHash,
      role: 'member',
      status: status ?? 'active',
      memberId,
    },
    select: { id: true, memberId: true, fullName: true, email: true, status: true },
  })

  return NextResponse.json({ member }, { status: 201 })
}
