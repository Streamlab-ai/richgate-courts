import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'
import SettingsForm from './SettingsForm'

export default async function AdminSettingsPage() {
  await requireAdmin()

  const courts = await db.court.findMany({
    include: { bookingSettings: true },
    orderBy: { name: 'asc' },
  })

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-2">Booking Settings</h1>
      <p className="text-zinc-500 text-sm mb-6">
        Configure availability hours, slot duration, and booking limits per court.
      </p>

      <div className="flex flex-col gap-6">
        {courts.map(court => (
          <SettingsForm key={court.id} court={court} settings={court.bookingSettings} />
        ))}
      </div>
    </div>
  )
}
