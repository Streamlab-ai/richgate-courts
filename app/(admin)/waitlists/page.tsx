import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'
import { Card, CardContent } from '@/components/ui/card'
import { statusBadge } from '@/components/ui/badge'

export default async function AdminWaitlistsPage() {
  await requireAdmin()

  const entries = await db.waitlistEntry.findMany({
    where: { status: 'waiting' },
    include: { member: { select: { fullName: true, memberId: true } } },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }, { position: 'asc' }],
  })

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-2">Waitlist</h1>
      <p className="text-zinc-500 text-sm mb-6">{entries.length} active entries</p>

      {entries.length === 0 && (
        <p className="text-center text-zinc-400 py-12 text-sm">No waitlist entries</p>
      )}

      <div className="flex flex-col gap-2">
        {entries.map(e => (
          <Card key={e.id}>
            <CardContent className="pt-3">
              <div className="flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-zinc-300">#{e.position}</span>
                    <p className="text-sm font-medium">{e.member.fullName}</p>
                    <span className="font-mono text-xs text-zinc-400">{e.member.memberId}</span>
                  </div>
                  <p className="text-xs text-zinc-500 capitalize ml-8">
                    {e.sportType} · {e.date} · {e.startTime}–{e.endTime}
                  </p>
                </div>
                {statusBadge(e.status)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
