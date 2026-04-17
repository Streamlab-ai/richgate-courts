import { requireActiveMember } from '@/lib/auth'
import { db } from '@/lib/db'
import ReserveWizard from './ReserveWizard'

export default async function ReservePage() {
  const profile = await requireActiveMember()

  const bptlSetting = await db.appSetting.findUnique({ where: { key: 'price_per_day_bptl_tennis' } }).catch(() => null)
  const bptlTennisRate = Number(bptlSetting?.value ?? 100)
  const memberType = (profile as { memberType?: string }).memberType ?? 'hoa'

  return <ReserveWizard memberType={memberType} bptlTennisRate={bptlTennisRate} />
}
