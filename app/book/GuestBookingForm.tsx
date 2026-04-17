'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

type SportType = 'tennis' | 'pickleball' | 'basketball'

interface Court { id: string; name: string; courtType: string }
interface Pricing { tennis: number; pickleball: number; basketball: number }
interface Slot { startTime: string; endTime: string; available: boolean; reason?: string }

interface Props {
  courts: Court[]
  pricing: Pricing
  monetizationEnabled: boolean
}

const ALL_SPORT_OPTIONS: { value: SportType; label: string; icon: string }[] = [
  { value: 'tennis',     label: 'Tennis',     icon: '🎾' },
  { value: 'pickleball', label: 'Pickleball', icon: '🏓' },
  { value: 'basketball', label: 'Basketball', icon: '🏀' },
]

// Sports allowed per court type
function allowedSports(courtType: string): SportType[] {
  if (courtType === 'tennis')       return ['tennis']
  if (courtType === 'multipurpose') return ['pickleball', 'basketball']
  return ['tennis', 'pickleball', 'basketball']  // fallback: all
}

function defaultSport(courtType: string): SportType {
  if (courtType === 'multipurpose') return 'pickleball'
  return 'tennis'
}

function todayString() {
  return new Date().toISOString().slice(0, 10)
}

export default function GuestBookingForm({ courts, pricing, monetizationEnabled }: Props) {
  const firstCourt = courts[0]
  // Step 1: court + sport + date + time slots
  const [step, setStep]               = useState<1 | 2>(1)
  const [courtId, setCourtId]         = useState(firstCourt?.id ?? '')
  const [sport, setSport]             = useState<SportType>(defaultSport(firstCourt?.courtType ?? ''))
  const [date, setDate]               = useState(todayString())
  const [slots, setSlots]             = useState<Slot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedSlots, setSelectedSlots] = useState<Slot[]>([])

  // Step 2: guest info + payment
  const [guestName, setGuestName]   = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')

  // When court changes, reset sport to a valid one for that court type
  useEffect(() => {
    const court = courts.find(c => c.id === courtId)
    if (!court) return
    const allowed = allowedSports(court.courtType)
    if (!allowed.includes(sport)) {
      setSport(defaultSport(court.courtType))
    }
  }, [courtId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load slots whenever court/sport/date changes
  useEffect(() => {
    if (!courtId || !sport || !date) return
    setSelectedSlots([])
    setSlots([])
    setLoadingSlots(true)

    fetch(`/api/slots/public?courtId=${courtId}&sportType=${sport}&date=${date}`)
      .then(r => r.json())
      .then(data => setSlots(data.slots ?? []))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false))
  }, [courtId, sport, date])

  function toggleSlot(slot: Slot) {
    if (!slot.available) return
    setSelectedSlots(prev => {
      const already = prev.some(s => s.startTime === slot.startTime)
      if (already) return prev.filter(s => s.startTime !== slot.startTime)
      // Only allow contiguous slots
      if (prev.length === 0) return [slot]
      const allSlots = prev.concat(slot).sort((a, b) => a.startTime.localeCompare(b.startTime))
      // Check contiguity
      for (let i = 1; i < allSlots.length; i++) {
        if (allSlots[i].startTime !== allSlots[i - 1].endTime) return prev // non-contiguous
      }
      return allSlots
    })
  }

  // Price calculation
  const pricePerHour = pricing[sport] ?? 200
  const durationMinutes = selectedSlots.reduce((acc, s) => {
    const [sh, sm] = s.startTime.split(':').map(Number)
    const [eh, em] = s.endTime.split(':').map(Number)
    return acc + (eh * 60 + em) - (sh * 60 + sm)
  }, 0)
  const totalPrice = Math.round((durationMinutes / 60) * pricePerHour)

  const startTime = selectedSlots[0]?.startTime ?? ''
  const endTime   = selectedSlots[selectedSlots.length - 1]?.endTime ?? ''

  async function handlePay(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedSlots.length) { setError('Please select at least one time slot'); return }
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courtId, sportType: sport, date, startTime, endTime, guestName, guestEmail, guestPhone }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Booking failed — please try again')
        return
      }

      if (data.mode === 'gcash' && data.checkoutUrl) {
        // Redirect to GCash payment
        window.location.href = data.checkoutUrl
      } else {
        // Monetization off (shouldn't reach here since page guards it) or test mode
        window.location.href = data.redirect ?? `/book/confirmed?ref=${data.bookingId}`
      }
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  const selectedCourt = courts.find(c => c.id === courtId)
  const sportOptions  = ALL_SPORT_OPTIONS.filter(s =>
    allowedSports(selectedCourt?.courtType ?? '').includes(s.value)
  )

  return (
    <div className="flex flex-col gap-5">

      {step === 1 && (
        <>
          {/* Court selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Court</label>
            <select
              value={courtId}
              onChange={e => setCourtId(e.target.value)}
              className="px-3 py-2.5 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black bg-white"
            >
              {courts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Sport selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Sport</label>
            <div className="flex gap-2">
              {sportOptions.map(s => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setSport(s.value)}
                  className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border text-xs font-medium transition-all ${
                    sport === s.value
                      ? 'bg-black text-white border-black'
                      : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-400'
                  }`}
                >
                  <span className="text-lg">{s.icon}</span>
                  {s.label}
                  <span className={`text-[10px] ${sport === s.value ? 'text-zinc-300' : 'text-zinc-400'}`}>
                    {monetizationEnabled ? `₱${pricing[s.value]}/hr` : 'Free'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Date picker */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Date</label>
            <input
              type="date"
              value={date}
              min={todayString()}
              onChange={e => setDate(e.target.value)}
              className="px-3 py-2.5 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black bg-white"
            />
          </div>

          {/* Time slots */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
              Available slots {selectedSlots.length > 0 && <span className="text-emerald-600">· {selectedSlots.length} selected</span>}
            </label>
            {loadingSlots ? (
              <p className="text-sm text-zinc-400 text-center py-4">Loading…</p>
            ) : slots.length === 0 ? (
              <p className="text-sm text-zinc-400 text-center py-4">No slots available for this date</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {slots.map(slot => {
                  const isSelected = selectedSlots.some(s => s.startTime === slot.startTime)
                  return (
                    <button
                      key={slot.startTime}
                      type="button"
                      disabled={!slot.available}
                      onClick={() => toggleSlot(slot)}
                      title={slot.reason}
                      className={`py-2.5 px-2 rounded-xl text-xs font-medium border transition-all ${
                        isSelected
                          ? 'bg-black text-white border-black'
                          : slot.available
                          ? 'bg-white border-zinc-200 text-zinc-700 hover:border-zinc-400'
                          : 'bg-zinc-50 border-zinc-100 text-zinc-300 cursor-not-allowed'
                      }`}
                    >
                      {slot.startTime}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Price summary */}
          {selectedSlots.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-emerald-800">
                  {selectedCourt?.name} · {sport.charAt(0).toUpperCase() + sport.slice(1)}
                </p>
                <p className="text-xs text-emerald-600">{date} · {startTime} – {endTime}</p>
              </div>
              <p className="text-lg font-bold text-emerald-700">
                {monetizationEnabled ? `₱${totalPrice}` : 'Free'}
              </p>
            </div>
          )}

          <Button
            type="button"
            size="lg"
            disabled={selectedSlots.length === 0}
            onClick={() => setStep(2)}
            className="w-full mt-1"
          >
            Continue →
          </Button>
        </>
      )}

      {step === 2 && (
        <form onSubmit={handlePay} className="flex flex-col gap-4">
          {/* Summary */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 flex justify-between items-center">
            <div>
              <p className="text-sm font-medium">{selectedCourt?.name} · {sport.charAt(0).toUpperCase() + sport.slice(1)}</p>
              <p className="text-xs text-zinc-500">{date} · {startTime} – {endTime}</p>
            </div>
            <div className="text-right">
              <p className="text-base font-bold">{monetizationEnabled ? `₱${totalPrice}` : 'Free'}</p>
              <button type="button" onClick={() => setStep(1)} className="text-xs text-zinc-400 hover:text-zinc-700 underline-offset-2 hover:underline">
                Change
              </button>
            </div>
          </div>

          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Your details</p>

          <Input
            id="guestName"
            label="Full name"
            type="text"
            autoComplete="name"
            placeholder="Juan dela Cruz"
            value={guestName}
            onChange={e => setGuestName(e.target.value)}
            required
          />
          <Input
            id="guestEmail"
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={guestEmail}
            onChange={e => setGuestEmail(e.target.value)}
            required
          />
          <Input
            id="guestPhone"
            label="Mobile number"
            type="tel"
            autoComplete="tel"
            placeholder="09xxxxxxxxx"
            value={guestPhone}
            onChange={e => setGuestPhone(e.target.value)}
            required
          />

          {error && (
            <p className="text-sm text-red-500 bg-red-50 px-4 py-3 rounded-xl">{error}</p>
          )}

          <Button type="submit" size="lg" loading={loading} className="w-full mt-1">
            {monetizationEnabled ? `Pay ₱${totalPrice} via GCash` : 'Confirm Booking'}
          </Button>

          <button type="button" onClick={() => setStep(1)} className="text-sm text-zinc-400 hover:text-zinc-600 text-center transition-colors">
            ← Back to slot selection
          </button>
        </form>
      )}
    </div>
  )
}
