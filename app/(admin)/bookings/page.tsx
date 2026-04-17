import { requireAdminSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { Card, CardContent } from '@/components/ui/card'
import { statusBadge } from '@/components/ui/badge'
import AdminBookingActions from './AdminBookingActions'
import CreateReservationForm from './CreateReservationForm'

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; courtId?: string; status?: string }>
}) {
  // JWT-only auth — no DB hit
  await requireAdminSession()
  const { date, courtId, status } = await searchParams
  const today = new Date().toISOString().slice(0, 10)

  // Both queries run in parallel
  const [bookings, courts] = await Promise.all([
    db.booking.findMany({
      where: {
        ...(date    ? { date }    : { date: { gte: today } }),
        ...(courtId ? { courtId } : {}),
        ...(status  ? { status }  : {}),
      },
      include: {
        member: { select: { fullName: true, memberId: true } },
        court:  { select: { name: true } },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      take: 100,
    }),
    db.court.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
  ])

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Bookings</h1>
        <CreateReservationForm />
      </div>

      {/* Filters */}
      <form className="flex flex-wrap gap-2 mb-6">
        <input name="date" type="date" defaultValue={date ?? today}
          className="px-3 py-2 border border-zinc-200 rounded-xl text-sm outline-none bg-white" />
        <select name="courtId" defaultValue={courtId ?? ''}
          className="px-3 py-2 border border-zinc-200 rounded-xl text-sm outline-none bg-white">
          <option value="">All courts</option>
          {courts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select name="status" defaultValue={status ?? ''}
          className="px-3 py-2 border border-zinc-200 rounded-xl text-sm outline-none bg-white">
          <option value="">All status</option>
          <option value="confirmed">Confirmed</option>
          <option value="pending_payment">Pending payment</option>
          <option value="cancelled">Cancelled</option>
          <option value="completed">Completed</option>
        </select>
        <button type="submit" className="px-4 py-2 bg-black text-white rounded-xl text-sm">Filter</button>
      </form>

      <p className="text-sm text-zinc-500 mb-4">{bookings.length} booking{bookings.length !== 1 ? 's' : ''}</p>

      <div className="flex flex-col gap-2">
        {bookings.map(b => {
          const displayName = b.member?.fullName ?? b.guestName ?? 'Guest'
          const displayId   = b.member?.memberId ?? null
          return (
            <Card key={b.id}>
              <CardContent className="pt-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium">
                      {displayName}
                      {b.isGuest
                        ? <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-md font-medium">Guest</span>
                        : displayId && <span className="font-mono text-zinc-400 ml-2 text-xs">{displayId}</span>
                      }
                    </p>
                    <p className="text-xs text-zinc-500 capitalize">{b.court.name} · {b.sportType}</p>
                    <p className="text-xs text-zinc-400">{b.date} · {b.startTime}–{b.endTime}</p>
                    {b.isGuest && b.paymentStatus === 'paid' && (
                      <span className="text-xs text-emerald-600">₱{(b.amountPaid ?? 0) / 100} paid</span>
                    )}
                    {b.adminOverride && <span className="text-xs text-purple-600">Admin override</span>}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {statusBadge(b.status)}
                    <AdminBookingActions bookingId={b.id} status={b.status} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
