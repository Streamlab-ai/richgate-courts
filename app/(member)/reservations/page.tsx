import { requireMemberSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { Card, CardContent } from '@/components/ui/card'
import { statusBadge } from '@/components/ui/badge'
import CancelBookingButton from './CancelBookingButton'
import QrDisplay from './QrDisplay'
import QRCode from 'qrcode'

export default async function MyReservationsPage() {
  // JWT-only auth — no DB hit
  const session = await requireMemberSession()
  const today = new Date().toISOString().slice(0, 10)

  // All queries in parallel — bookings + waitlist
  const [upcoming, past, waitlist] = await Promise.all([
    db.booking.findMany({
      where: { memberId: session.sub, status: 'confirmed', date: { gte: today } },
      include: { court: { select: { name: true } } },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    }),
    db.booking.findMany({
      where: { memberId: session.sub, date: { lt: today } },
      include: { court: { select: { name: true } } },
      orderBy: [{ date: 'desc' }, { startTime: 'desc' }],
      take: 20,
    }),
    db.waitlistEntry.findMany({
      where: { memberId: session.sub, status: 'waiting' },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  // Generate real QR data URLs for upcoming bookings with tokens
  const qrDataUrls: Record<string, string> = {}
  await Promise.all(upcoming.map(async (b) => {
    if (b.qrToken) {
      qrDataUrls[b.id] = await QRCode.toDataURL(b.qrToken, { width: 200, margin: 2 })
    }
  }))

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">My Bookings</h1>

      {/* Upcoming */}
      {upcoming.length === 0 && (
        <div className="text-center py-10 text-zinc-400">
          <p className="text-4xl mb-3">📅</p>
          <p className="text-sm">No upcoming bookings</p>
        </div>
      )}

      {upcoming.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">Upcoming</h2>
          <div className="flex flex-col gap-3">
            {upcoming.map(b => (
              <Card key={b.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-medium">{b.court.name}</p>
                      <p className="text-sm text-zinc-500 capitalize">{b.sportType}</p>
                      <p className="text-xs text-zinc-400 mt-0.5">{b.date} · {b.startTime}–{b.endTime}</p>
                    </div>
                    {statusBadge(b.status)}
                  </div>

                  {/* QR Token */}
                  {b.qrToken && qrDataUrls[b.id] && <QrDisplay qrDataUrl={qrDataUrls[b.id]} token={b.qrToken} />}

                  <CancelBookingButton bookingId={b.id} />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Waitlist */}
      {waitlist.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">Waitlist</h2>
          <div className="flex flex-col gap-2">
            {waitlist.map(w => (
              <Card key={w.id}>
                <CardContent className="pt-3">
                  <p className="text-sm font-medium capitalize">{w.sportType} · {w.date}</p>
                  <p className="text-xs text-zinc-500">{w.startTime}–{w.endTime} · Position #{w.position}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Past */}
      {past.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">Past</h2>
          <div className="flex flex-col gap-2">
            {past.map(b => (
              <Card key={b.id}>
                <CardContent className="pt-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{b.court.name}</p>
                      <p className="text-xs text-zinc-400 capitalize">{b.sportType} · {b.date} · {b.startTime}–{b.endTime}</p>
                    </div>
                    {statusBadge(b.status)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
