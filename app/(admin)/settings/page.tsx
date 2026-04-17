import { requireAdminSession } from '@/lib/auth'
import { db } from '@/lib/db'
import SettingsForm from './SettingsForm'
import CourtFeesForm from './CourtFeesForm'

const FEE_KEYS = [
  { key: 'price_per_hour_tennis',      label: 'Tennis — Price per Hour (₱)',      default: 200 },
  { key: 'price_per_hour_pickleball',  label: 'Pickleball — Price per Hour (₱)',  default: 200 },
  { key: 'price_per_hour_basketball',  label: 'Basketball — Price per Hour (₱)',  default: 400 },
]

const ALL_SETTING_KEYS = ['monetization_enabled', ...FEE_KEYS.map(f => f.key), 'price_per_day_bptl_tennis']

export default async function AdminSettingsPage() {
  const me = await requireAdminSession()
  const currentUserIsSuperAdmin = me.role === 'super_admin'

  // Wrap appSetting query defensively — table may not exist yet on first deploy
  const [courts, settingRows] = await Promise.all([
    db.court.findMany({ include: { bookingSettings: true }, orderBy: { name: 'asc' } }),
    db.appSetting.findMany({ where: { key: { in: ALL_SETTING_KEYS } } }).catch(() => []),
  ])

  const settingMap = Object.fromEntries(settingRows.map(r => [r.key, r.value]))
  const monetizationEnabled = (settingMap['monetization_enabled'] ?? 'false') === 'true'
  const bptlTennisRate = Number(settingMap['price_per_day_bptl_tennis'] ?? 100)

  // Merge DB values with defaults (in case some keys aren't seeded yet)
  const initialFees = FEE_KEYS.map(f => ({
    key:   f.key,
    label: f.label,
    value: Number(settingMap[f.key] ?? f.default),
  }))

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-2">Settings</h1>
      <p className="text-zinc-500 text-sm mb-6">
        Manage court fees and per-court booking rules.
      </p>

      <div className="flex flex-col gap-6">
        {/* Court fees — shown first */}
        <CourtFeesForm
          initialFees={initialFees}
          monetizationEnabled={monetizationEnabled}
          isSuperAdmin={currentUserIsSuperAdmin}
          bptlTennisRate={bptlTennisRate}
        />

        <hr className="border-zinc-200" />

        {/* Per-court booking settings */}
        <div>
          <h2 className="text-base font-semibold mb-1">Booking Rules</h2>
          <p className="text-xs text-zinc-500 mb-4">Availability hours, slot duration, and booking limits per court.</p>
          <div className="flex flex-col gap-6">
            {courts.map(court => (
              <SettingsForm key={court.id} court={court} settings={court.bookingSettings} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
