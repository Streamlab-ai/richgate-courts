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
  if (!session || (session.role !== 'admin' && session.role !== 'super_admin')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { status, fullName, email, phone, role, password } = await request.json()

  // Identify target
  const target = await db.profile.findUnique({ where: { id }, select: { role: true } })
  const targetIsSuperAdmin = target?.role === 'super_admin'

  // Identify calling admin
  const me = await db.profile.findUnique({ where: { id: session.sub }, select: { role: true } })
  const callerIsSuperAdmin = me?.role === 'super_admin'

  // Super admin's role and status are locked — no one (including themselves) can change them
  if (targetIsSuperAdmin && (role || status)) {
    return NextResponse.json({ error: 'The super admin role and status cannot be changed' }, { status: 403 })
  }

  // Only super admin can promote another user to admin
  if (role === 'admin' && !callerIsSuperAdmin) {
    return NextResponse.json({ error: 'Only the super admin can grant admin access' }, { status: 403 })
  }

  // Admins cannot change the password of other admins or the super admin — only super admin can
  if (password && (target?.role === 'admin' || target?.role === 'super_admin') && !callerIsSuperAdmin) {
    return NextResponse.json({ error: 'Only the super admin can change another admin\'s password' }, { status: 403 })
  }

  // Check email uniqueness if changing
  if (email) {
    const existing = await db.profile.findFirst({ where: { email, NOT: { id } } })
    if (existing) return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
  }

  const data: Record<string, unknown> = {}
  if (fullName)            data.fullName = fullName
  if (email)               data.email = email
  if (phone !== undefined) data.phone = phone || null
  if (status && !targetIsSuperAdmin) data.status = status
  if (role   && !targetIsSuperAdmin) data.role   = role
  if (password)            data.passwordHash = await bcrypt.hash(password, 12)

  const updated = await db.profile.update({ where: { id }, data })
  return NextResponse.json({ ok: true, member: updated })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session || (session.role !== 'admin' && session.role !== 'super_admin')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params

  // Super admin can never be deleted
  const target = await db.profile.findUnique({ where: { id }, select: { role: true } })
  if (target?.role === 'super_admin') {
    return NextResponse.json({ error: 'The super admin account cannot be deleted' }, { status: 403 })
  }

  await db.profile.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
