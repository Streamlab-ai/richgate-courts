import { requireAdminSession } from '@/lib/auth'
import { db } from '@/lib/db'
import SportRulesManager from './SportRulesManager'

export default async function AdminSportRulesPage() {
  await requireAdminSession()

  const [courts, rules] = await Promise.all([
    db.court.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
    db.weeklySportRule.findMany({
      include: { court: { select: { name: true } } },
      orderBy: [{ dayOfWeek: 'asc' }, { sportType: 'asc' }, { startTime: 'asc' }],
    }),
  ])

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-2">Weekly Sport Rules</h1>
      <p className="text-zinc-500 text-sm mb-6">
        Restrict a sport to specific time windows on certain days. If no rule exists for a court + sport + day, that sport is available any time during court hours.
      </p>
      <SportRulesManager courts={courts} initialRules={rules} />
    </div>
  )
}
