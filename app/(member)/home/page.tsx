import { requireMemberSession } from '@/lib/auth'
import { db } from '@/lib/db'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { statusBadge } from '@/components/ui/badge'

export default async function MemberHomePage() {
  // JWT-only auth check — no DB hit
  const session = await requireMemberSession()
  const today = new Date().toISOString().slice(0, 10)

  // All queries run in parallel — profile + bookings + waitlist + courts
  const [profile, upcomingBookings, waitlistEntries, courts] = await Promise.all([
    db.profile.findUniqueOrThrow({ where: { id: session.sub } }),
    db.booking.findMany({
      where: { memberId: session.sub, status: 'confirmed', date: { gte: today } },
      include: { court: { select: { name: true } } },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      take: 5,
    }),
    db.waitlistEntry.count({
      where: { memberId: session.sub, status: 'waiting' },
    }),
    db.court.findMany({
      where: { isActive: true },
      include: { bookingSettings: true },
    }),
  ])

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <p className="text-zinc-500 text-sm">Welcome back</p>
        <h1 className="text-2xl font-semibold">{profile.fullName}</h1>
        {profile.memberId && (
          <p className="text-xs text-zinc-400 mt-0.5 font-mono">{profile.memberId}</p>
        )}
      </div>

      {/* Admin panel shortcut */}
      {profile.role === 'admin' && (
        <Link href="/dashboard">
          <div className="bg-zinc-900 text-white rounded-2xl px-4 py-3 flex items-center justify-between mb-4 active:scale-95 transition-transform">
            <span className="text-sm font-medium">⚙️ Admin Panel</span>
            <span className="text-zinc-400 text-xs">→</span>
          </div>
        </Link>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Link href="/reserve">
          <div className="bg-black text-white rounded-2xl p-4 flex flex-col gap-1 h-24 justify-between active:scale-95 transition-transform">
            <span className="text-2xl">📅</span>
            <span className="text-sm font-medium">Book a court</span>
          </div>
        </Link>
        <Link href="/reservations">
          <div className="bg-white rounded-2xl p-4 flex flex-col gap-1 h-24 justify-between border border-zinc-100 shadow-sm active:scale-95 transition-transform">
            <span className="text-2xl">🎾</span>
            <span className="text-sm font-medium text-zinc-900">My bookings</span>
            {upcomingBookings.length > 0 && (
              <span className="text-xs text-zinc-500">{upcomingBookings.length} upcoming</span>
            )}
          </div>
        </Link>
      </div>

      {/* Courts overview */}
      <h2 className="text-base font-semibold mb-3">Courts</h2>
      <div className="flex flex-col gap-3 mb-6">
        {courts.map(court => (
          <Card key={court.id}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{court.name}</p>
                  <p className="text-xs text-zinc-500 capitalize mt-0.5">{court.courtType}</p>
                </div>
                <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Open</span>
              </div>
              {court.bookingSettings && (
                <p className="text-xs text-zinc-400 mt-2">
                  {court.bookingSettings.openTimeStart}–{court.bookingSettings.openTimeEnd} · {court.bookingSettings.slotDurationMinutes}min slots
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Upcoming bookings */}
      {upcomingBookings.length > 0 && (
        <>
          <h2 className="text-base font-semibold mb-3">Upcoming</h2>
          <div className="flex flex-col gap-2">
            {upcomingBookings.map(b => (
              <Card key={b.id}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{b.court.name}</p>
                      <p className="text-xs text-zinc-500 capitalize">{b.sportType} · {b.date} · {b.startTime}–{b.endTime}</p>
                    </div>
                    {statusBadge(b.status)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {waitlistEntries > 0 && (
        <p className="text-xs text-amber-600 bg-amber-50 px-4 py-2 rounded-xl mt-4">
          You are on {waitlistEntries} waitlist{waitlistEntries > 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}
