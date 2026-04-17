'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { clsx } from 'clsx'

type Sport = 'tennis' | 'basketball' | 'pickleball'

interface Court { id: string; name: string; courtType: string }
interface Slot {
  date: string; startTime: string; endTime: string
  available: boolean; reason?: string; pickleballSlotsLeft?: number
}

const SPORTS: { key: Sport; label: string; emoji: string; courtType: string }[] = [
  { key: 'tennis',      label: 'Tennis',      emoji: '🎾', courtType: 'tennis' },
  { key: 'basketball',  label: 'Basketball',  emoji: '🏀', courtType: 'multipurpose' },
  { key: 'pickleball',  label: 'Pickleball',  emoji: '🏓', courtType: 'multipurpose' },
]

type Step = 'sport' | 'date' | 'slots' | 'confirm' | 'done'

function todayStr() { return new Date().toISOString().slice(0, 10) }
function addDays(d: string, n: number) {
  const dt = new Date(d + 'T00:00:00'); dt.setDate(dt.getDate() + n); return dt.toISOString().slice(0, 10)
}

interface Props {
  memberType: string
  bptlTennisRate: number
}

export default function ReserveWizard({ memberType, bptlTennisRate }: Props) {
  const [step, setStep]               = useState<Step>('sport')
  const [sport, setSport]             = useState<Sport | null>(null)
  const [court, setCourt]             = useState<Court | null>(null)
  const [date, setDate]               = useState(todayStr())
  const [slots, setSlots]             = useState<Slot[]>([])
  const [selected, setSelected]       = useState<Slot[]>([])
  const [loading, setLoading]         = useState(false)
  const [result, setResult]           = useState<{
    ok?: boolean; bookings?: unknown[]; mode?: string; checkoutUrl?: string;
    succeeded?: unknown[]; failed?: { slot: { startTime: string }; reason: string }[]
  } | null>(null)

  // Fetch courts when sport changes
  useEffect(() => {
    if (!sport) return
    const sportDef = SPORTS.find(s => s.key === sport)!
    fetch('/api/courts')
      .then(r => r.json())
      .then(({ courts }) => {
        const match = courts?.find((c: Court) => c.courtType === sportDef.courtType)
        if (match) setCourt(match)
      })
  }, [sport])

  // Fetch slots when court + date changes
  useEffect(() => {
    if (!court || !sport) return
    setLoading(true)
    fetch(`/api/slots?courtId=${court.id}&sportType=${sport}&date=${date}`)
      .then(r => r.json())
      .then(({ slots }) => setSlots(slots ?? []))
      .finally(() => setLoading(false))
  }, [court, sport, date])

  function toggleSlot(slot: Slot) {
    if (!slot.available) return
    setSelected(prev =>
      prev.some(s => s.startTime === slot.startTime && s.date === slot.date)
        ? prev.filter(s => !(s.startTime === slot.startTime && s.date === slot.date))
        : [...prev, slot]
    )
  }

  async function handleConfirm() {
    if (!court || !sport || selected.length === 0) return
    setLoading(true)
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courtId: court.id, sportType: sport, slots: selected }),
      })
      const data = await res.json()
      setResult(data)
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
        return
      }
      setStep('done')
    } finally {
      setLoading(false)
    }
  }

  async function handleWaitlist(slot: Slot) {
    if (!court || !sport) return
    await fetch('/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courtId: court.id, sportType: sport, date: slot.date, startTime: slot.startTime, endTime: slot.endTime }),
    })
    alert(`Added to waitlist for ${slot.date} ${slot.startTime}`)
  }

  // Compute BPTL pricing info for confirm step
  function getBptlPriceInfo(): string | null {
    if (memberType !== 'bptl') return null
    if (!court || !sport || selected.length === 0) return null
    if (court.courtType === 'tennis') {
      return `₱${bptlTennisRate} daily access fee (GCash) — paid once per day, all same-day bookings free after`
    }
    return null // multipurpose uses per-hour rate, shown generically
  }

  // ── STEP: sport ───────────────────────────────────────────────────────────
  if (step === 'sport') return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Book a court</h1>
      <p className="text-zinc-500 text-sm mb-6">Choose your sport</p>
      <div className="flex flex-col gap-3">
        {SPORTS.map(s => (
          <button
            key={s.key}
            onClick={() => { setSport(s.key); setStep('date') }}
            className="flex items-center gap-4 bg-white rounded-2xl p-4 border border-zinc-100 shadow-sm active:scale-95 transition-transform text-left"
          >
            <span className="text-3xl">{s.emoji}</span>
            <div>
              <p className="font-medium">{s.label}</p>
              <p className="text-xs text-zinc-400 capitalize">{s.courtType} court</p>
            </div>
            <span className="ml-auto text-zinc-300">›</span>
          </button>
        ))}
      </div>
    </div>
  )

  // ── STEP: date ────────────────────────────────────────────────────────────
  if (step === 'date') {
    const dates = Array.from({ length: 7 }, (_, i) => addDays(todayStr(), i))
    return (
      <div>
        <button onClick={() => setStep('sport')} className="text-sm text-zinc-500 mb-4">← Back</button>
        <h1 className="text-2xl font-semibold mb-1">Pick a date</h1>
        <p className="text-zinc-500 text-sm mb-6">
          {sport && SPORTS.find(s => s.key === sport)?.emoji} {sport} · {court?.name}
        </p>
        <div className="grid grid-cols-4 gap-2 mb-6">
          {dates.map(d => {
            const dt = new Date(d + 'T00:00:00')
            return (
              <button
                key={d}
                onClick={() => { setDate(d); setStep('slots') }}
                className={clsx(
                  'flex flex-col items-center py-3 rounded-xl border transition-all',
                  d === date ? 'bg-black text-white border-black' : 'bg-white border-zinc-200 text-zinc-700 hover:border-zinc-400',
                )}
              >
                <span className="text-xs">{dt.toLocaleDateString('en', { weekday: 'short' })}</span>
                <span className="text-lg font-semibold">{dt.getDate()}</span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // ── STEP: slots ───────────────────────────────────────────────────────────
  if (step === 'slots') return (
    <div>
      <button onClick={() => setStep('date')} className="text-sm text-zinc-500 mb-4">← Back</button>
      <h1 className="text-2xl font-semibold mb-1">Select time slots</h1>
      <p className="text-zinc-500 text-sm mb-4">
        {sport} · {date} · {selected.length > 0 && <span className="text-black font-medium">{selected.length} selected</span>}
      </p>

      {loading ? (
        <div className="text-center py-12 text-zinc-400">Loading slots…</div>
      ) : (
        <div className="flex flex-col gap-2 mb-6">
          {slots.map(slot => {
            const isSelected = selected.some(s => s.startTime === slot.startTime && s.date === slot.date)
            return (
              <div key={slot.startTime} className={clsx(
                'flex items-center justify-between rounded-xl px-4 py-3 border transition-all',
                slot.available
                  ? isSelected
                    ? 'bg-black text-white border-black'
                    : 'bg-white border-zinc-200 cursor-pointer hover:border-zinc-400'
                  : 'bg-zinc-50 border-zinc-100 opacity-60',
              )}>
                <button
                  onClick={() => toggleSlot(slot)}
                  disabled={!slot.available}
                  className="flex-1 text-left"
                >
                  <span className="font-medium text-sm">{slot.startTime} – {slot.endTime}</span>
                  {slot.available && sport === 'pickleball' && slot.pickleballSlotsLeft !== undefined && (
                    <span className="text-xs ml-2 opacity-60">{slot.pickleballSlotsLeft} left</span>
                  )}
                  {!slot.available && slot.reason && (
                    <p className="text-xs text-zinc-400 mt-0.5">{slot.reason}</p>
                  )}
                </button>
                {!slot.available && (
                  <button
                    onClick={() => handleWaitlist(slot)}
                    className="text-xs text-blue-600 ml-3 shrink-0"
                  >
                    Waitlist
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {selected.length > 0 && (
        <div className="fixed bottom-20 left-0 right-0 px-4">
          <div className="max-w-lg mx-auto">
            <Button size="lg" className="w-full shadow-lg" onClick={() => setStep('confirm')}>
              Review {selected.length} slot{selected.length > 1 ? 's' : ''} →
            </Button>
          </div>
        </div>
      )}
    </div>
  )

  // ── STEP: confirm ─────────────────────────────────────────────────────────
  if (step === 'confirm') {
    const priceInfo = getBptlPriceInfo()
    return (
      <div>
        <button onClick={() => setStep('slots')} className="text-sm text-zinc-500 mb-4">← Back</button>
        <h1 className="text-2xl font-semibold mb-1">Confirm booking</h1>
        <p className="text-zinc-500 text-sm mb-6">{court?.name} · {sport}</p>

        <div className="flex flex-col gap-2 mb-6">
          {selected.map(s => (
            <Card key={s.startTime + s.date}>
              <CardContent className="pt-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-sm">{s.date}</p>
                    <p className="text-xs text-zinc-500">{s.startTime} – {s.endTime}</p>
                  </div>
                  <button onClick={() => toggleSlot(s)} className="text-xs text-red-500">Remove</button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {memberType === 'bptl' && priceInfo && (
          <div className="mb-4 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl">
            <p className="text-xs font-semibold text-emerald-700 mb-0.5">BPTL Member Pricing</p>
            <p className="text-sm text-emerald-800">{priceInfo}</p>
          </div>
        )}

        {memberType === 'hoa' && (
          <div className="mb-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-xs font-semibold text-blue-700 mb-0.5">HOA Member</p>
            <p className="text-sm text-blue-800">Free — no payment required</p>
          </div>
        )}

        <Button size="lg" className="w-full" loading={loading} onClick={handleConfirm}>
          {memberType === 'bptl' && court?.courtType !== 'tennis' ? 'Proceed to payment' :
           memberType === 'bptl' ? 'Confirm & pay' :
           'Confirm booking'}
        </Button>
      </div>
    )
  }

  // ── STEP: done ────────────────────────────────────────────────────────────
  if (step === 'done') return (
    <div className="flex flex-col items-center text-center py-12">
      <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
        <span className="text-3xl">✅</span>
      </div>
      <h1 className="text-2xl font-semibold mb-2">
        {result?.bookings && result.bookings.length > 0 ? 'Booking confirmed!' :
         result?.succeeded && result.succeeded.length > 0 ? 'Booking confirmed!' : 'Some slots failed'}
      </h1>
      {result?.succeeded && result.succeeded.length > 0 && (
        <p className="text-zinc-500 text-sm mb-2">{result.succeeded.length} slot(s) booked</p>
      )}
      {result?.bookings && result.bookings.length > 0 && (
        <p className="text-zinc-500 text-sm mb-2">Booking confirmed!</p>
      )}
      {result?.failed && result.failed.length > 0 && (
        <div className="mt-2 text-sm text-red-500">
          {result.failed.map((f) => (
            <p key={f.slot.startTime}>{f.slot.startTime}: {f.reason}</p>
          ))}
        </div>
      )}
      <div className="flex gap-3 mt-8">
        <Button variant="secondary" onClick={() => { setStep('sport'); setSport(null); setSelected([]) }}>
          Book another
        </Button>
        <Button onClick={() => window.location.href = '/reservations'}>
          My bookings
        </Button>
      </div>
    </div>
  )

  return null
}
