import { requireAdminSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { Card, CardContent } from '@/components/ui/card'
import { statusBadge } from '@/components/ui/badge'

export default async function AdminRecurringPage() {
  await requireAdminSession()

  const series = await db.recurrenceSeries.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      bookings: {
        where: { status: 'confirmed' },
        select: { id: true },
      },
    },
  })

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Recurring Series</h1>

      {series.length === 0 && (
        <p className="text-center text-zinc-400 py-12 text-sm">No recurring series yet</p>
      )}

      <div className="flex flex-col gap-3">
        {series.map(s => (
          <Card key={s.id}>
            <CardContent className="pt-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-sm capitalize">{s.sportType} · {s.frequency}</p>
                  <p className="text-xs text-zinc-500">{s.startDate} → {s.endDate}</p>
                  <p className="text-xs text-zinc-400">{s.startTime}–{s.endTime}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">{s.bookings.length} confirmed bookings</p>
                </div>
                {statusBadge(s.status)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
