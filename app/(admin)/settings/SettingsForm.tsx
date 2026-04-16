'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Settings {
  openTimeStart: string
  openTimeEnd: string
  slotDurationMinutes: number
  maxAdvanceBookingDays: number
  maxSessionHours: number
  maxWeeklyHours: number
  maxMonthlyHours: number
}

interface Props {
  court: { id: string; name: string; courtType: string }
  settings: Settings | null
}

const SLOT_OPTIONS = [30, 60, 90, 120]

export default function SettingsForm({ court, settings }: Props) {
  const router = useRouter()
  const [form, setForm] = useState<Settings>({
    openTimeStart:         settings?.openTimeStart         ?? '06:00',
    openTimeEnd:           settings?.openTimeEnd           ?? '22:00',
    slotDurationMinutes:   settings?.slotDurationMinutes   ?? 60,
    maxAdvanceBookingDays: settings?.maxAdvanceBookingDays ?? 7,
    maxSessionHours:       settings?.maxSessionHours       ?? 2,
    maxWeeklyHours:        settings?.maxWeeklyHours        ?? 6,
    maxMonthlyHours:       settings?.maxMonthlyHours       ?? 20,
  })
  const [loading, setLoading] = useState(false)
  const [saved, setSaved]     = useState(false)
  const [error, setError]     = useState('')

  function set(k: keyof Settings) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const val = ['slotDurationMinutes','maxAdvanceBookingDays','maxSessionHours','maxWeeklyHours','maxMonthlyHours'].includes(k)
        ? Number(e.target.value)
        : e.target.value
      setForm(f => ({ ...f, [k]: val }))
      setSaved(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courtId: court.id, ...form }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Save failed'); return }
      setSaved(true)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">{court.courtType === 'tennis' ? '🎾' : '🏀'}</span>
          <h2 className="font-semibold text-base">{court.name}</h2>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-4">

          {/* Availability hours */}
          <fieldset className="flex flex-col gap-2">
            <legend className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">Availability hours</legend>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-zinc-500">Opens</span>
                <input
                  type="time"
                  value={form.openTimeStart}
                  onChange={set('openTimeStart')}
                  className="px-3 py-2 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black bg-white"
                  required
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-zinc-500">Closes</span>
                <input
                  type="time"
                  value={form.openTimeEnd}
                  onChange={set('openTimeEnd')}
                  className="px-3 py-2 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black bg-white"
                  required
                />
              </label>
            </div>
          </fieldset>

          {/* Slot duration */}
          <fieldset className="flex flex-col gap-2">
            <legend className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">Slot duration</legend>
            <div className="flex gap-2 flex-wrap">
              {SLOT_OPTIONS.map(min => (
                <button
                  key={min}
                  type="button"
                  onClick={() => { setForm(f => ({ ...f, slotDurationMinutes: min })); setSaved(false) }}
                  className={`px-4 py-2 rounded-xl text-sm border transition-all ${
                    form.slotDurationMinutes === min
                      ? 'bg-black text-white border-black'
                      : 'bg-white border-zinc-200 text-zinc-700 hover:border-zinc-400'
                  }`}
                >
                  {min} min
                </button>
              ))}
            </div>
          </fieldset>

          {/* Booking horizon */}
          <fieldset className="flex flex-col gap-2">
            <legend className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">Booking horizon</legend>
            <label className="flex items-center justify-between">
              <span className="text-sm text-zinc-700">Days in advance members can book</span>
              <input
                type="number" min={1} max={90}
                value={form.maxAdvanceBookingDays}
                onChange={set('maxAdvanceBookingDays')}
                className="w-20 px-3 py-2 border border-zinc-200 rounded-xl text-sm text-center outline-none focus:ring-2 focus:ring-black bg-white"
              />
            </label>
          </fieldset>

          {/* Usage limits */}
          <fieldset className="flex flex-col gap-2">
            <legend className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">Usage limits (hours)</legend>
            <div className="flex flex-col gap-2">
              {([
                ['maxSessionHours',  'Max per session'],
                ['maxWeeklyHours',   'Max per week'],
                ['maxMonthlyHours',  'Max per month'],
              ] as [keyof Settings, string][]).map(([key, label]) => (
                <label key={key} className="flex items-center justify-between">
                  <span className="text-sm text-zinc-700">{label}</span>
                  <input
                    type="number" min={1} max={200}
                    value={form[key] as number}
                    onChange={set(key)}
                    className="w-20 px-3 py-2 border border-zinc-200 rounded-xl text-sm text-center outline-none focus:ring-2 focus:ring-black bg-white"
                  />
                </label>
              ))}
            </div>
          </fieldset>

          {error && <p className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-xl">{error}</p>}

          <div className="flex items-center gap-3 pt-1">
            <Button type="submit" loading={loading} className="flex-1">
              Save changes
            </Button>
            {saved && <span className="text-sm text-emerald-600 font-medium">✓ Saved</span>}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
