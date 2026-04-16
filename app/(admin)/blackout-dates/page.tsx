import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'
import BlackoutManager from './BlackoutManager'

export default async function AdminBlackoutDatesPage() {
  await requireAdmin()

  const [courts, blackouts] = await Promise.all([
    db.court.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
    db.blackoutDate.findMany({
      include: { court: { select: { name: true } } },
      orderBy: { date: 'asc' },
    }),
  ])

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-2">Blackout Dates</h1>
      <p className="text-zinc-500 text-sm mb-6">
        Block entire days on a court. No bookings can be made on blacked-out dates.
      </p>
      <BlackoutManager courts={courts} initialBlackouts={blackouts} />
    </div>
  )
}
