// PATCH  /api/admin/members/[id]  — edit member
// DELETE /api/admin/members/[id]  — delete member
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { status, fullName, email, phone, role, password } = await request.json()

  // Check email uniqueness if changing
  if (email) {
    const existing = await db.profile.findFirst({ where: { email, NOT: { id } } })
    if (existing) return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
  }

  const data: Record<string, unknown> = {}
  if (fullName)            data.fullName = fullName
  if (email)               data.email = email
  if (phone !== undefined) data.phone = phone || null
  if (status)              data.status = status
  if (role)                data.role = role
  if (password)            data.passwordHash = await bcrypt.hash(password, 12)

  const updated = await db.profile.update({ where: { id }, data })
  return NextResponse.json({ ok: true, member: updated })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params

  // Protect super admin (RG-000001) from deletion
  const target = await db.profile.findUnique({ where: { id }, select: { memberId: true } })
  if (target?.memberId === 'RG-000001') {
    return NextResponse.json({ error: 'Cannot delete the super admin account' }, { status: 403 })
  }

  await db.profile.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
