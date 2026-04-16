'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Court { id: string; name: string; courtType: string }
interface Blackout { id: string; date: string; reason: string | null; court: { name: string }; courtId: string }

interface Props {
  courts: Court[]
  initialBlackouts: Blackout[]
}

function todayStr() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function BlackoutManager({ courts, initialBlackouts }: Props) {
  const router = useRouter()
  const [blackouts, setBlackouts] = useState<Blackout[]>(initialBlackouts)
  const [courtId, setCourtId]     = useState(courts[0]?.id ?? '')
  const [date, setDate]           = useState(todayStr())
  const [reason, setReason]       = useState('')
  const [loading, setLoading]     = useState(false)
  const [deleting, setDeleting]   = useState<string | null>(null)
  const [error, setError]         = useState('')

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/admin/blackout-dates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courtId, date, reason: reason || undefined }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to add blackout'); return }
      // Optimistic update
      const courtName = courts.find(c => c.id === courtId)?.name ?? ''
      setBlackouts(prev => [...prev, { id: data.blackout.id, date, reason: reason || null, court: { name: courtName }, courtId }]
        .sort((a, b) => a.date.localeCompare(b.date)))
      setDate(todayStr())
      setReason('')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    try {
      await fetch('/api/admin/blackout-dates', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      setBlackouts(prev => prev.filter(b => b.id !== id))
    } finally {
      setDeleting(null)
    }
  }

  // Group by court for display
  const grouped = courts.map(c => ({
    court: c,
    dates: blackouts.filter(b => b.courtId === c.id),
  }))

  return (
    <div className="flex flex-col gap-6">
      {/* Add form */}
      <Card>
        <CardContent className="pt-5">
          <h2 className="font-semibold mb-4">Add blackout date</h2>
          <form onSubmit={handleAdd} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-zinc-500">Court</span>
              <select
                value={courtId}
                onChange={e => setCourtId(e.target.value)}
                className="px-3 py-2.5 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black bg-white"
              >
                {courts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-zinc-500">Date</span>
              <input
                type="date"
                value={date}
                min={todayStr()}
                onChange={e => setDate(e.target.value)}
                className="px-3 py-2.5 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black bg-white"
                required
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-zinc-500">Reason (optional)</span>
              <input
                type="text"
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="e.g. Public holiday, maintenance"
                className="px-3 py-2.5 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black bg-white"
              />
            </label>

            {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}

            <Button type="submit" loading={loading} className="mt-1">
              Add blackout date
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Existing blackouts grouped by court */}
      {grouped.map(({ court, dates }) => (
        <div key={court.id}>
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">
            {court.courtType === 'tennis' ? '🎾' : '🏀'} {court.name}
            {dates.length > 0 && <span className="ml-2 normal-case font-normal">({dates.length} date{dates.length !== 1 ? 's' : ''})</span>}
          </h2>

          {dates.length === 0 ? (
            <p className="text-sm text-zinc-400 py-3">No blackout dates set</p>
          ) : (
            <div className="flex flex-col gap-2">
              {dates.map(b => (
                <Card key={b.id}>
                  <CardContent className="pt-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{formatDate(b.date)}</p>
                        {b.reason && <p className="text-xs text-zinc-400 mt-0.5">{b.reason}</p>}
                      </div>
                      <button
                        onClick={() => handleDelete(b.id)}
                        disabled={deleting === b.id}
                        className="text-xs text-red-500 hover:underline disabled:opacity-50"
                      >
                        {deleting === b.id ? 'Removing…' : 'Remove'}
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}
