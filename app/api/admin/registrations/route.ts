// GET  /api/admin/registrations          — list pending registrations
// POST /api/admin/registrations          — approve or reject
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { sendNotification } from '@/services/notifications'

function adminOnly(session: Awaited<ReturnType<typeof getSession>>) {
  if (!session || session.role !== 'admin') return true
  return false
}

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (adminOnly(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = request.nextUrl
  const status = searchParams.get('status') ?? 'pending'

  const registrations = await db.registrationRequest.findMany({
    where: { status },
    include: { profile: { select: { id: true, fullName: true, email: true, phone: true, createdAt: true } } },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({ registrations })
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (adminOnly(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { registrationId, action, notes } = body  // action: 'approve' | 'reject'

  if (!registrationId || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'registrationId and action (approve|reject) are required' }, { status: 400 })
  }

  const reg = await db.registrationRequest.findUnique({
    where: { id: registrationId },
    include: { profile: true },
  })
  if (!reg) return NextResponse.json({ error: 'Registration not found' }, { status: 404 })

  const newStatus = action === 'approve' ? 'approved' : 'rejected'
  const memberStatus = action === 'approve' ? 'active' : 'rejected'

  // Generate member ID if approving
  let memberId = reg.profile.memberId
  if (action === 'approve' && !memberId) {
    const count = await db.profile.count({ where: { memberId: { not: null } } })
    memberId = `RG-${String(count + 1).padStart(6, '0')}`
  }

  await db.$transaction([
    db.registrationRequest.update({
      where: { id: registrationId },
      data: { status: newStatus, notes: notes ?? null, reviewedBy: session!.sub, reviewedAt: new Date() },
    }),
    db.profile.update({
      where: { id: reg.profileId },
      data: { status: memberStatus, ...(memberId ? { memberId } : {}) },
    }),
  ])

  await sendNotification({
    profileId: reg.profileId,
    type: action === 'approve' ? 'member_approved' : 'member_rejected',
    subject: action === 'approve' ? 'Your membership is approved!' : 'Membership application update',
    body: action === 'approve'
      ? `Welcome! Your member ID is ${memberId}. You can now book courts.`
      : `We're sorry, your application was not approved.${notes ? ` Note: ${notes}` : ''}`,
  })

  return NextResponse.json({ ok: true, memberId })
}
