import { requireMemberSession } from '@/lib/auth'
import { db } from '@/lib/db'
import ReserveWizard from './ReserveWizard'

export default async function ReservePage() {
  // JWT-only auth — no DB hit; role is in the JWT
  const session = await requireMemberSession()

  const memberType = session.role

  // Find actual tennis court (don't hardcode ID)
  const tennisCourt = await db.court.findFirst({
    where: { courtType: 'tennis', isActive: true },
    select: { id: true },
  })

  const [bptlSetting, tennisRateSetting, bptlRules] = await Promise.all([
    db.appSetting.findUnique({ where: { key: 'price_per_day_bptl_tennis' } }).catch(() => null),
    db.appSetting.findUnique({ where: { key: 'price_per_hour_tennis' } }).catch(() => null),
    (memberType === 'bptl' || memberType === 'hoa') && tennisCourt
      ? db.weeklySportRule.findMany({
          where: {
            courtId:   tennisCourt.id,
            sportType: 'tennis',
            bookerType: 'bptl',
            isActive:  true,
          },
          select: { dayOfWeek: true, startTime: true, endTime: true },
          orderBy: { dayOfWeek: 'asc' },
        })
      : Promise.resolve([]),
  ])

  const bptlTennisRate   = Number(bptlSetting?.value  ?? 100)
  const tennisPricePerHour = Number(tennisRateSetting?.value ?? 200)

  return (
    <ReserveWizard
      memberType={memberType}
      bptlTennisRate={bptlTennisRate}
      tennisPricePerHour={tennisPricePerHour}
      bptlTennisSchedule={bptlRules}
    />
  )
}
