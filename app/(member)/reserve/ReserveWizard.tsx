'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { clsx } from 'clsx'

type Sport = 'tennis' | 'basketball' | 'pickleball'
type BookingMode = 'bptl_exclusive' | 'standard'

interface Court { id: string; name: string; courtType: string }
interface Slot {
  date: string; startTime: string; endTime: string
  available: boolean; reason?: string; pickleballSlotsLeft?: number
  isBptlSlot?: boolean
}
interface BptlRule { dayOfWeek: number; startTime: string; endTime: string }

const SPORTS: { key: Sport; label: string; emoji: string; courtType: string }[] = [
  { key: 'tennis',      label: 'Tennis',      emoji: '🎾', courtType: 'tennis' },
  { key: 'basketball',  label: 'Basketball',  emoji: '🏀', courtType: 'multipurpose' },
  { key: 'pickleball',  label: 'Pickleball',  emoji: '🏓', courtType: 'multipurpose' },
]

type Step = 'sport' | 'tennis_mode' | 'date' | 'slots' | 'confirm' | 'done'

function todayStr() { return new Date().toISOString().slice(0, 10) }
function addDays(d: string, n: number) {
  const dt = new Date(d + 'T00:00:00'); dt.setDate(dt.getDate() + n); return dt.toISOString().slice(0, 10)
}

// Format HH:MM → "6:00 AM"
function fmtTime(t: string): string {
  const [h, m] = t.split(':').map(Number)
  const ampm = h < 12 ? 'AM' : 'PM'
  const hour = h % 12 === 0 ? 12 : h % 12
  return m === 0 ? `${hour} ${ampm}` : `${hour}:${m.toString().padStart(2, '0')} ${ampm}`
}

// Group BPTL rules into human-readable schedule lines
function formatBptlSchedule(rules: BptlRule[]): { days: string; hours: string }[] {
  const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const byTime = new Map<string, number[]>()
  for (const r of rules) {
    const key = `${r.startTime}|${r.endTime}`
    if (!byTime.has(key)) byTime.set(key, [])
    byTime.get(key)!.push(r.dayOfWeek)
  }
  const lines: { days: string; hours: string }[] = []
  for (const [key, days] of byTime) {
    const [start, end] = key.split('|')
    const sorted = [...days].sort((a, b) => a - b)
    let dayLabel: string
    if (JSON.stringify(sorted) === JSON.stringify([1, 2, 3, 4, 5])) dayLabel = 'Mon – Fri'
    else if (JSON.stringify(sorted) === JSON.stringify([0, 6])) dayLabel = 'Sat & Sun'
    else if (sorted.length === 7) dayLabel = 'Every day'
    else dayLabel = sorted.map(d => DAY[d]).join(', ')
    lines.push({ days: dayLabel, hours: `${fmtTime(start)} – ${fmtTime(end)}` })
  }
  return lines
}

// Get the BPTL rule for a specific date
function getBptlWindow(rules: BptlRule[], date: string): { startTime: string; endTime: string } | null {
  const dow = new Date(date + 'T00:00:00').getDay()
  const rule = rules.find(r => r.dayOfWeek === dow)
  return rule ? { startTime: rule.startTime, endTime: rule.endTime } : null
}

interface Props {
  memberType: string
  bptlTennisRate: number
  tennisPricePerHour: number
  bptlTennisSchedule: BptlRule[]
}

export default function ReserveWizard({ memberType, bptlTennisRate, tennisPricePerHour, bptlTennisSchedule }: Props) {
  const isBptl = memberType === 'bptl'
  const isHoa  = memberType === 'hoa' || memberType === 'admin' || memberType === 'super_admin'
  const showTennisMode = isBptl || isHoa  // Both BPTL and HOA see mode selection for tennis

  const [step, setStep]               = useState<Step>('sport')
  const [sport, setSport]             = useState<Sport | null>(null)
  const [bookingMode, setBookingMode] = useState<BookingMode | null>(null)
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

  // Slots filtered by booking mode (tennis mode selection)
  const filteredSlots: Slot[] = (() => {
    if (sport !== 'tennis' || !bookingMode || !showTennisMode) return slots
    if (bookingMode === 'bptl_exclusive') return slots.filter(s => s.isBptlSlot)
    return slots.filter(s => !s.isBptlSlot)
  })()

  function toggleSlot(slot: Slot) {
    if (!slot.available) return
    setSelected(prev =>
      prev.some(s => s.startTime === slot.startTime && s.date === slot.date)
        ? prev.filter(s => !(s.startTime === slot.startTime && s.date === slot.date))
        : [...prev, slot]
    )
  }

  // Auto-select all available BPTL exclusive slots for the day
  function selectBptlExclusiveSlots() {
    const bptlSlots = slots.filter(s => s.isBptlSlot && s.available)
    setSelected(bptlSlots)
  }

  // Pricing calculations
  const durationMinutes = selected.reduce((acc, s) => {
    const [sh, sm] = s.startTime.split(':').map(Number)
    const [eh, em] = s.endTime.split(':').map(Number)
    return acc + (eh * 60 + em) - (sh * 60 + sm)
  }, 0)

  function getPricing(): { label: string; subtext: string; requiresPayment: boolean } {
    // HOA members: always free
    if (isHoa) return { label: 'Free', subtext: 'HOA member — no charge', requiresPayment: false }
    // BPTL exclusive tennis
    if (isBptl && sport === 'tennis' && bookingMode === 'bptl_exclusive') {
      return {
        label: `₱${bptlTennisRate} / day`,
        subtext: 'Paid once per calendar day — all same-day tennis bookings free after',
        requiresPayment: true,
      }
    }
    // BPTL standard tennis
    if (isBptl && sport === 'tennis' && bookingMode === 'standard') {
      const total = Math.round((durationMinutes / 60) * tennisPricePerHour)
      return {
        label: selected.length > 0 ? `₱${total}` : `₱${tennisPricePerHour}/hr`,
        subtext: `Standard hourly rate · ${durationMinutes > 0 ? `${durationMinutes} min` : ''}`,
        requiresPayment: true,
      }
    }
    // BPTL multipurpose (basketball/pickleball)
    return { label: 'Pay per hour', subtext: 'Via GCash at checkout', requiresPayment: true }
  }

  async function handleConfirm() {
    if (!court || !sport || selected.length === 0) return
    setLoading(true)
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courtId: court.id,
          sportType: sport,
          slots: selected,
          bookingMode: bookingMode ?? undefined,
        }),
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

  const bptlScheduleLines = formatBptlSchedule(bptlTennisSchedule)
  const bptlWindow = getBptlWindow(bptlTennisSchedule, date)

  // ── STEP: sport ─────────────────────────────────────────────────────────────
  if (step === 'sport') return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Book a court</h1>
      <p className="text-zinc-500 text-sm mb-6">Choose your sport</p>
      <div className="flex flex-col gap-3">
        {SPORTS.map(s => (
          <button
            key={s.key}
            onClick={() => {
              setSport(s.key)
              setBookingMode(null)
              setSelected([])
              setStep('date')
            }}
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

  // ── STEP: date ──────────────────────────────────────────────────────────────
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
                onClick={() => {
                  setDate(d)
                  setSelected([])
                  // Tennis for BPTL/HOA → mode selection; otherwise → slots
                  setStep(showTennisMode && sport === 'tennis' ? 'tennis_mode' : 'slots')
                }}
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

  // ── STEP: tennis_mode (BPTL + HOA tennis) ──────────────────────────────────
  if (step === 'tennis_mode') return (
    <div>
      <button onClick={() => setStep('date')} className="text-sm text-zinc-500 mb-4">← Back</button>
      <h1 className="text-2xl font-semibold mb-1">Tennis booking type</h1>
      <p className="text-zinc-500 text-sm mb-6">
        {isBptl ? 'As a BPTL member, choose how you\'d like to book'
          : 'Choose your preferred court time'}
      </p>

      <div className="flex flex-col gap-4">

        {/* Option 1 — BPTL Exclusive Time */}
        <button
          onClick={() => {
            setBookingMode('bptl_exclusive')
            // BPTL exclusive is a single indivisible time block — no slot picking.
            // Build one virtual slot from the schedule rule for this day.
            const win = getBptlWindow(bptlTennisSchedule, date)
            if (win) {
              setSelected([{ date, startTime: win.startTime, endTime: win.endTime, available: true, isBptlSlot: true }])
              setStep('confirm')
            } else {
              setSelected([])
              setStep('slots') // fallback — no exclusive window on this day
            }
          }}
          className="text-left bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-5 hover:border-emerald-400 active:scale-95 transition-all"
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="font-semibold text-emerald-900">🎾 BPTL Exclusive Slot</p>
              <p className="text-xs text-emerald-600 mt-0.5">
                Reserved for BPTL members and Richgate homeowners only
              </p>
            </div>
            <span className={clsx(
              'text-xs px-2 py-1 rounded-lg font-semibold shrink-0 ml-2',
              isHoa ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'
            )}>
              {isHoa ? 'Free' : `₱${bptlTennisRate}/day`}
            </span>
          </div>

          {bptlWindow && (
            <div className="flex gap-2 text-sm mb-3">
              <span className="text-emerald-800 font-medium">
                {fmtTime(bptlWindow.startTime)} – {fmtTime(bptlWindow.endTime)}
              </span>
            </div>
          )}

          {bptlScheduleLines.length > 0 ? (
            <div className="flex flex-col gap-1 mb-3">
              {bptlScheduleLines.map((line, i) => (
                <div key={i} className="flex gap-2 text-xs text-emerald-600">
                  <span className="font-medium w-20 shrink-0">{line.days}</span>
                  <span>{line.hours}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-emerald-700 mb-3">Schedule set by admin</p>
          )}

          <p className="text-xs text-emerald-600 bg-emerald-100 rounded-lg px-3 py-2">
            {isHoa
              ? 'Free for HOA members — book the full exclusive time block'
              : 'One-time daily fee · All same-day tennis bookings free after first payment'}
          </p>
        </button>

        {/* Option 2 — Standard Hourly */}
        <button
          onClick={() => { setBookingMode('standard'); setSelected([]); setStep('slots') }}
          className="text-left bg-white border-2 border-zinc-200 rounded-2xl p-5 hover:border-zinc-400 active:scale-95 transition-all"
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="font-semibold text-zinc-900">📅 Standard Booking</p>
              <p className="text-xs text-zinc-500 mt-0.5">Outside exclusive hours</p>
            </div>
            <span className={clsx(
              'text-xs px-2 py-1 rounded-lg font-semibold shrink-0 ml-2',
              isHoa ? 'bg-blue-100 text-blue-700' : 'bg-zinc-100 text-zinc-700'
            )}>
              {isHoa ? 'Free' : `₱${tennisPricePerHour}/hr`}
            </span>
          </div>

          <p className="text-sm text-zinc-600 mb-3">
            Book during open court hours · Pick your time slots
          </p>

          <p className="text-xs text-zinc-400 bg-zinc-50 rounded-lg px-3 py-2">
            {isHoa
              ? 'Free for HOA members — select any available open court slot'
              : 'Same rates as non-members · GCash payment at checkout'}
          </p>
        </button>

      </div>
    </div>
  )

  // ── STEP: slots ─────────────────────────────────────────────────────────────
  if (step === 'slots') {
    const modeLabel = bookingMode === 'bptl_exclusive' ? 'BPTL Exclusive'
      : bookingMode === 'standard' ? 'Standard'
      : null
    return (
      <div>
        <button onClick={() => setStep(showTennisMode && sport === 'tennis' ? 'tennis_mode' : 'date')} className="text-sm text-zinc-500 mb-4">← Back</button>
        <h1 className="text-2xl font-semibold mb-1">Select time slots</h1>
        <p className="text-zinc-500 text-sm mb-4">
          {sport} · {date}
          {modeLabel && <span className={clsx('ml-2 text-xs px-2 py-0.5 rounded-full font-medium',
            bookingMode === 'bptl_exclusive' ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-600'
          )}>{modeLabel}</span>}
          {selected.length > 0 && <span className="ml-2 text-black font-medium">{selected.length} selected</span>}
        </p>

        {loading ? (
          <div className="text-center py-12 text-zinc-400">Loading slots…</div>
        ) : filteredSlots.length === 0 ? (
          <div className="text-center py-12 text-zinc-400">
            <p className="text-3xl mb-3">📭</p>
            <p className="text-sm">
              {bookingMode === 'bptl_exclusive'
                ? 'No exclusive slots available on this date'
                : bookingMode === 'standard'
                  ? 'No standard slots available on this date'
                  : 'No slots available for this date'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 mb-6">
            {filteredSlots.map(slot => {
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
  }

  // ── STEP: confirm ────────────────────────────────────────────────────────────
  if (step === 'confirm') {
    const pricing = getPricing()
    const isBptlExclusive = bookingMode === 'bptl_exclusive'

    return (
      <div>
        <button onClick={() => {
          if (isBptlExclusive) {
            setSelected([])
            setStep('tennis_mode')
          } else {
            setStep('slots')
          }
        }} className="text-sm text-zinc-500 mb-4">← Back</button>
        <h1 className="text-2xl font-semibold mb-1">Confirm booking</h1>
        <p className="text-zinc-500 text-sm mb-6">{court?.name} · {sport}</p>

        {/* BPTL Exclusive: show single time block instead of individual slots */}
        {isBptlExclusive && selected.length > 0 ? (
          <Card className="mb-5">
            <CardContent className="pt-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-sm">{selected[0].date}</p>
                  <p className="text-xs text-zinc-500">
                    {fmtTime(selected[0].startTime)} – {fmtTime(selected[0].endTime)}
                  </p>
                  <p className="text-xs text-emerald-600 mt-1 font-medium">
                    BPTL Exclusive Access
                  </p>
                </div>
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                  Exclusive
                </span>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-2 mb-5">
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
        )}

        {/* Pricing summary */}
        <div className={clsx(
          'mb-5 px-4 py-3 rounded-xl border',
          isBptlExclusive ? 'bg-emerald-50 border-emerald-200'
            : isHoa ? 'bg-blue-50 border-blue-200'
            : isBptl ? 'bg-zinc-50 border-zinc-200'
            : 'bg-zinc-50 border-zinc-200'
        )}>
          <div className="flex justify-between items-start">
            <div>
              <p className={clsx('text-xs font-semibold mb-0.5',
                isBptlExclusive ? 'text-emerald-700'
                  : isHoa ? 'text-blue-700'
                  : 'text-zinc-600'
              )}>
                {isBptlExclusive
                  ? (isHoa ? 'HOA Member — Exclusive Access' : 'BPTL Daily Access Fee')
                  : bookingMode === 'standard'
                    ? (isHoa ? 'HOA Member' : 'Standard Rate')
                    : isHoa ? 'HOA Member' : 'Pricing'}
              </p>
              <p className={clsx('text-sm',
                isBptlExclusive ? 'text-emerald-800'
                  : isHoa ? 'text-blue-800'
                  : 'text-zinc-700'
              )}>
                {pricing.subtext}
              </p>
            </div>
            <p className={clsx('text-lg font-bold shrink-0 ml-3',
              isBptlExclusive ? 'text-emerald-700'
                : isHoa ? 'text-blue-700'
                : 'text-zinc-800'
            )}>
              {pricing.label}
            </p>
          </div>
        </div>

        <Button
          size="lg"
          className="w-full"
          loading={loading}
          onClick={handleConfirm}
        >
          {pricing.requiresPayment ? 'Proceed to payment' : 'Confirm booking'}
        </Button>
      </div>
    )
  }

  // ── STEP: done ───────────────────────────────────────────────────────────────
  if (step === 'done') return (
    <div className="flex flex-col items-center text-center py-12">
      <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
        <span className="text-3xl">✅</span>
      </div>
      <h1 className="text-2xl font-semibold mb-2">
        {(result?.bookings && (result.bookings as unknown[]).length > 0) ||
         (result?.succeeded && (result.succeeded as unknown[]).length > 0)
          ? 'Booking confirmed!' : 'Some slots failed'}
      </h1>
      {result?.succeeded && (result.succeeded as unknown[]).length > 0 && (
        <p className="text-zinc-500 text-sm mb-2">{(result.succeeded as unknown[]).length} slot(s) booked</p>
      )}
      {result?.bookings && (result.bookings as unknown[]).length > 0 && (
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
        <Button variant="secondary" onClick={() => { setStep('sport'); setSport(null); setSelected([]); setBookingMode(null) }}>
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
