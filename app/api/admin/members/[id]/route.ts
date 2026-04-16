// PATCH  /api/admin/members/[id]  — edit member (status, etc.)
// DELETE /api/admin/members/[id]  — delete member
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await request.json()
  const { status, fullName, phone } = body

  const updated = await db.profile.update({
    where: { id },
    data: {
      ...(status   ? { status }   : {}),
      ...(fullName ? { fullName } : {}),
      ...(phone !== undefined ? { phone } : {}),
    },
  })

  return NextResponse.json({ ok: true, member: updated })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  await db.profile.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
