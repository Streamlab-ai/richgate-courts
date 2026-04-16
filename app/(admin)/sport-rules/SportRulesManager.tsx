'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Court { id: string; name: string; courtType: string }
interface Rule {
  id: string
  courtId: string
  court: { name: string }
  dayOfWeek: number
  sportType: string
  startTime: string
  endTime: string
  isActive: boolean
}

interface Props {
  courts: Court[]
  initialRules: Rule[]
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const SPORT_OPTIONS = [
  { value: 'basketball', label: '🏀 Basketball' },
  { value: 'pickleball', label: '🏓 Pickleball' },
  { value: 'tennis',     label: '🎾 Tennis' },
]

function sportIcon(s: string) {
  if (s === 'basketball') return '🏀'
  if (s === 'pickleball') return '🏓'
  return '🎾'
}

function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  const ampm = h < 12 ? 'am' : 'pm'
  const hour = h % 12 === 0 ? 12 : h % 12
  return m === 0 ? `${hour}${ampm}` : `${hour}:${m.toString().padStart(2, '0')}${ampm}`
}

export default function SportRulesManager({ courts, initialRules }: Props) {
  const [rules, setRules] = useState<Rule[]>(initialRules)

  // Form state
  const [courtId,   setCourtId]   = useState(courts[0]?.id ?? '')
  const [day,       setDay]       = useState(1) // Monday default
  const [sport,     setSport]     = useState('basketball')
  const [startTime, setStartTime] = useState('06:00')
  const [endTime,   setEndTime]   = useState('12:00')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')

  // Per-rule action state
  const [toggling, setToggling] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/admin/sport-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courtId, dayOfWeek: day, sportType: sport, startTime, endTime }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to add rule'); return }
      const courtName = courts.find(c => c.id === courtId)?.name ?? ''
      const newRule: Rule = { ...data.rule, court: { name: courtName } }
      setRules(prev =>
        [...prev, newRule].sort((a, b) =>
          a.dayOfWeek - b.dayOfWeek || a.sportType.localeCompare(b.sportType) || a.startTime.localeCompare(b.startTime)
        )
      )
    } finally {
      setLoading(false)
    }
  }

  async function handleToggle(rule: Rule) {
    setToggling(rule.id)
    try {
      const res = await fetch('/api/admin/sport-rules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: rule.id, isActive: !rule.isActive }),
      })
      if (res.ok) {
        setRules(prev => prev.map(r => r.id === rule.id ? { ...r, isActive: !r.isActive } : r))
      }
    } finally {
      setToggling(null)
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    try {
      await fetch('/api/admin/sport-rules', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      setRules(prev => prev.filter(r => r.id !== id))
    } finally {
      setDeleting(null)
    }
  }

  // Group rules by court → day
  const grouped = courts.map(court => {
    const courtRules = rules.filter(r => r.courtId === court.id)
    const byDay = DAYS.map((dayName, idx) => ({
      dayName,
      dayIdx: idx,
      rules: courtRules.filter(r => r.dayOfWeek === idx),
    })).filter(d => d.rules.length > 0)
    return { court, byDay, total: courtRules.length }
  })

  return (
    <div className="flex flex-col gap-6">

      {/* Info callout */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
        <strong>How rules work:</strong> Adding a rule restricts that sport to the specified window on that day.
        Multiple rules on the same day create multiple allowed windows. <strong>No rules = unrestricted</strong> — the sport can be booked any time the court is open.
      </div>

      {/* Add rule form */}
      <Card>
        <CardContent className="pt-5">
          <h2 className="font-semibold mb-4">Add sport rule</h2>
          <form onSubmit={handleAdd} className="flex flex-col gap-3">

            <label className="flex flex-col gap-1">
              <span className="text-xs text-zinc-500">Court</span>
              <select
                value={courtId}
                onChange={e => setCourtId(e.target.value)}
                className="px-3 py-2.5 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black bg-white"
              >
                {courts.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.courtType === 'tennis' ? '🎾' : '🏀'} {c.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-zinc-500">Day of week</span>
              <div className="flex gap-1.5 flex-wrap">
                {DAY_SHORT.map((d, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setDay(idx)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                      day === idx
                        ? 'bg-black text-white border-black'
                        : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-400'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-zinc-500">Sport</span>
              <div className="flex gap-2 flex-wrap">
                {SPORT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSport(opt.value)}
                    className={`px-4 py-2 rounded-xl text-sm border transition-all ${
                      sport === opt.value
                        ? 'bg-black text-white border-black'
                        : 'bg-white border-zinc-200 text-zinc-700 hover:border-zinc-400'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-zinc-500">Start time</span>
                <input
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="px-3 py-2.5 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black bg-white"
                  required
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-zinc-500">End time</span>
                <input
                  type="time"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="px-3 py-2.5 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black bg-white"
                  required
                />
              </label>
            </div>

            {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}

            <Button type="submit" loading={loading} className="mt-1">
              Add rule
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Existing rules grouped by court */}
      {grouped.map(({ court, byDay, total }) => (
        <div key={court.id}>
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">
            {court.courtType === 'tennis' ? '🎾' : '🏀'} {court.name}
            {total > 0
              ? <span className="ml-2 normal-case font-normal">({total} rule{total !== 1 ? 's' : ''})</span>
              : <span className="ml-2 normal-case font-normal text-emerald-600">— no restrictions (all sports unrestricted)</span>
            }
          </h2>

          {byDay.length === 0 ? (
            <p className="text-sm text-zinc-400 py-2">No rules set — all sports available during court hours every day.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {byDay.map(({ dayName, dayIdx, rules: dayRules }) => (
                <div key={dayIdx}>
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">{dayName}</p>
                  <div className="flex flex-col gap-2">
                    {dayRules.map(rule => (
                      <Card key={rule.id} className={rule.isActive ? '' : 'opacity-50'}>
                        <CardContent className="pt-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="text-lg shrink-0">{sportIcon(rule.sportType)}</span>
                              <div className="min-w-0">
                                <p className="font-medium text-sm capitalize">{rule.sportType}</p>
                                <p className="text-xs text-zinc-400 mt-0.5">
                                  {formatTime(rule.startTime)} – {formatTime(rule.endTime)}
                                </p>
                              </div>
                              {!rule.isActive && (
                                <span className="text-xs bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full shrink-0">Paused</span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <button
                                onClick={() => handleToggle(rule)}
                                disabled={toggling === rule.id}
                                className="text-xs text-zinc-500 hover:text-zinc-800 disabled:opacity-50 transition-colors"
                              >
                                {toggling === rule.id ? '…' : rule.isActive ? 'Pause' : 'Resume'}
                              </button>
                              <button
                                onClick={() => handleDelete(rule.id)}
                                disabled={deleting === rule.id}
                                className="text-xs text-red-500 hover:underline disabled:opacity-50"
                              >
                                {deleting === rule.id ? 'Removing…' : 'Remove'}
                              </button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

    </div>
  )
}
