import { requireActiveMember } from '@/lib/auth'
import { db } from '@/lib/db'
import ReserveWizard from './ReserveWizard'

export default async function ReservePage() {
  const profile = await requireActiveMember()

  const memberType = (profile as { memberType?: string }).memberType ?? 'hoa'

  const [bptlSetting, tennisRateSetting, bptlRules] = await Promise.all([
    db.appSetting.findUnique({ where: { key: 'price_per_day_bptl_tennis' } }).catch(() => null),
    db.appSetting.findUnique({ where: { key: 'price_per_hour_tennis' } }).catch(() => null),
    memberType === 'bptl'
      ? db.weeklySportRule.findMany({
          where: {
            courtId:   '00000000-0000-0000-0001-000000000001',
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
