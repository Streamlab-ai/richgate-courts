import { db } from '@/lib/db'
import GuardCheckin from './GuardCheckin'

export default async function GuardPage() {
  const today = new Date().toISOString().slice(0, 10)

  const bookings = await db.booking.findMany({
    where: {
      date: today,
      status: { in: ['confirmed', 'completed', 'pending_payment'] },
    },
    include: {
      member: { select: { fullName: true, memberId: true, memberType: true } },
      court:  { select: { name: true } },
    },
    orderBy: [{ startTime: 'asc' }],
  })

  const dateLabel = new Date().toLocaleDateString('en-PH', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold">Access Verification</h1>
        <p className="text-sm text-zinc-500">{dateLabel}</p>
      </div>

      <GuardCheckin />

      <div>
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">
          Today&apos;s Schedule · {bookings.filter(b => b.status === 'confirmed').length} confirmed
        </h2>
        {bookings.length === 0 ? (
          <p className="text-sm text-zinc-400 text-center py-8">No bookings scheduled today</p>
        ) : (
          <div className="flex flex-col gap-2">
            {bookings.map(b => {
              const displayName = b.member?.fullName ?? b.guestName ?? 'Guest'
              const memberType  = b.isGuest ? 'guest' : (b.member?.memberType ?? 'hoa')
              return (
                <div key={b.id} className="bg-white rounded-2xl px-4 py-3 border border-zinc-100">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium">{displayName}</p>
                        {memberType === 'bptl'  && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-semibold">BPTL</span>}
                        {memberType === 'guest' && <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-semibold">Guest</span>}
                        {memberType === 'hoa'   && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-semibold">HOA</span>}
                      </div>
                      <p className="text-xs text-zinc-500">{b.court.name} · <span className="capitalize">{b.sportType}</span></p>
                      <p className="text-xs text-zinc-400 font-medium">{b.startTime} – {b.endTime}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-lg font-medium shrink-0 ${
                      b.status === 'completed'       ? 'bg-zinc-100 text-zinc-500' :
                      b.status === 'pending_payment' ? 'bg-amber-50 text-amber-600' :
                                                       'bg-emerald-50 text-emerald-700'
                    }`}>
                      {b.status === 'completed' ? 'Checked in' : b.status === 'pending_payment' ? 'Pending' : 'Confirmed'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
