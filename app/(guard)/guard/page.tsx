import { db } from '@/lib/db'
import GuardCheckin from './GuardCheckin'

export default async function GuardPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const { date: qDate } = await searchParams
  const today = new Date().toISOString().slice(0, 10)
  const date  = qDate ?? today

  const bookings = await db.booking.findMany({
    where: {
      date,
      status: { in: ['confirmed', 'completed', 'pending_payment'] },
    },
    include: {
      member: { select: { fullName: true, memberId: true, memberType: true } },
      court:  { select: { name: true } },
    },
    orderBy: [{ startTime: 'asc' }],
  })

  const dateLabel = new Date(date + 'T00:00:00').toLocaleDateString('en-PH', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const confirmedCount = bookings.filter(b => b.status === 'confirmed').length

  return (
    <div className="flex flex-col gap-5">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold">All Bookings</h1>
        <p className="text-sm text-zinc-500">Court access verification</p>
      </div>

      {/* QR Check-in */}
      <GuardCheckin />

      {/* Date selector */}
      <form method="get" className="flex items-center gap-2">
        <input
          type="date"
          name="date"
          defaultValue={date}
          className="flex-1 px-3 py-2.5 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black bg-white"
        />
        <button
          type="submit"
          className="px-4 py-2.5 bg-black text-white rounded-xl text-sm font-medium"
        >
          Go
        </button>
        {date !== today && (
          <a
            href="/guard"
            className="px-4 py-2.5 border border-zinc-200 text-zinc-600 rounded-xl text-sm font-medium hover:bg-zinc-50"
          >
            Today
          </a>
        )}
      </form>

      {/* Schedule */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
            {date === today ? "Today's Schedule" : dateLabel}
          </p>
          {bookings.length > 0 && (
            <span className="text-xs text-zinc-400">
              {confirmedCount} confirmed · {bookings.length} total
            </span>
          )}
        </div>

        {bookings.length === 0 ? (
          <div className="text-center py-10 text-zinc-400">
            <p className="text-3xl mb-2">📋</p>
            <p className="text-sm">No bookings for this date</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {bookings.map(b => {
              const displayName = b.member?.fullName ?? b.guestName ?? 'Guest'
              const memberType  = b.isGuest ? 'guest' : (b.member?.memberType ?? 'hoa')
              return (
                <div key={b.id} className="bg-white rounded-2xl px-4 py-3 border border-zinc-100">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-medium">{displayName}</p>
                        {memberType === 'bptl'  && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-semibold">BPTL</span>}
                        {memberType === 'guest' && <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-semibold">Guest</span>}
                        {memberType === 'hoa'   && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-semibold">HOA</span>}
                      </div>
                      <p className="text-xs text-zinc-500">{b.court.name} · <span className="capitalize">{b.sportType}</span></p>
                      <p className="text-xs text-zinc-400 font-medium">{b.startTime} – {b.endTime}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-lg font-medium shrink-0 ml-2 ${
                      b.status === 'completed'       ? 'bg-zinc-100 text-zinc-500' :
                      b.status === 'pending_payment' ? 'bg-amber-50 text-amber-600' :
                                                       'bg-emerald-50 text-emerald-700'
                    }`}>
                      {b.status === 'completed' ? 'Checked in' : b.status === 'pending_payment' ? 'Pending' : 'Confirmed'}
                    </span>
                  </div>
                  {b.member?.memberId && (
                    <p className="text-[10px] font-mono text-zinc-300 mt-1">{b.member.memberId}</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}
