import { requireAdminSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'

export default async function AdminDashboardPage() {
  // JWT-only auth — no DB hit
  await requireAdminSession()

  const today = new Date().toISOString().slice(0, 10)

  // All queries run in a single parallel batch
  const [pendingReg, totalMembers, todayBookings, waitlistCount, pendingCheckins, recentBookings] = await Promise.all([
    db.registrationRequest.count({ where: { status: 'pending' } }),
    db.profile.count({ where: { role: { in: ['hoa', 'bptl'] }, status: 'active' } }),
    db.booking.count({ where: { date: today, status: 'confirmed' } }),
    db.waitlistEntry.count({ where: { status: 'waiting' } }),
    db.booking.count({ where: { date: today, status: 'confirmed' } }),
    db.booking.findMany({
      where: { date: { gte: today }, status: { in: ['confirmed', 'pending_payment'] } },
      include: {
        member: { select: { fullName: true, memberId: true } },
        court:  { select: { name: true } },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      take: 10,
    }),
  ])

  const stats = [
    { label: 'Pending approvals', value: pendingReg, href: '/registrations', color: 'bg-amber-50 text-amber-700', urgent: pendingReg > 0 },
    { label: 'Active members',    value: totalMembers, href: '/members', color: 'bg-blue-50 text-blue-700' },
    { label: 'Today\'s bookings', value: todayBookings, href: '/bookings', color: 'bg-emerald-50 text-emerald-700' },
    { label: 'Waitlist entries',  value: waitlistCount, href: '/waitlists', color: 'bg-zinc-100 text-zinc-700' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 gap-3 mb-8">
        {stats.map(s => (
          <Link key={s.label} href={s.href}>
            <Card className={`${s.urgent ? 'ring-2 ring-amber-400' : ''}`}>
              <CardContent className="pt-4">
                <p className={`text-3xl font-bold ${s.color.split(' ')[1]}`}>{s.value}</p>
                <p className="text-xs text-zinc-500 mt-1">{s.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <h2 className="text-base font-semibold mb-3">Upcoming bookings</h2>
      {recentBookings.length === 0 ? (
        <p className="text-sm text-zinc-400 text-center py-8">No upcoming bookings</p>
      ) : (
        <div className="flex flex-col gap-2">
          {recentBookings.map(b => (
            <Card key={b.id}>
              <CardContent className="pt-3">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium">
                      {b.member?.fullName ?? b.guestName ?? 'Guest'}
                      {b.isGuest && <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-md font-medium">Guest</span>}
                    </p>
                    <p className="text-xs text-zinc-400">{b.court.name} · <span className="capitalize">{b.sportType}</span> · {b.date} {b.startTime}–{b.endTime}</p>
                  </div>
                  <span className="text-xs font-mono text-zinc-400">{b.member?.memberId ?? '—'}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
