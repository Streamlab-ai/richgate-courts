'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Fee { key: string; label: string; value: number }

interface Props {
  initialFees: Fee[]
  monetizationEnabled: boolean
  isSuperAdmin: boolean
  bptlTennisRate: number
}

const SPORT_ICON: Record<string, string> = {
  price_per_hour_tennis:     '🎾',
  price_per_hour_pickleball: '🏓',
  price_per_hour_basketball: '🏀',
}

export default function CourtFeesForm({ initialFees, monetizationEnabled: initEnabled, isSuperAdmin, bptlTennisRate: initBptlRate }: Props) {
  const router = useRouter()
  const [enabled, setEnabled]       = useState(initEnabled)
  const [fees, setFees]             = useState<Fee[]>(initialFees)
  const [bptlRate, setBptlRate]     = useState(initBptlRate)
  const [loading, setLoading]       = useState(false)
  const [saved, setSaved]           = useState(false)
  const [error, setError]           = useState('')

  function updateFee(key: string, raw: string) {
    setSaved(false)
    setFees(prev => prev.map(f => f.key === key ? { ...f, value: Number(raw) || 0 } : f))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/app-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: [
            // Only include monetization toggle if caller is super admin
            ...(isSuperAdmin ? [{ key: 'monetization_enabled', value: String(enabled) }] : []),
            ...fees.map(f => ({ key: f.key, value: String(f.value) })),
            { key: 'price_per_day_bptl_tennis', value: String(bptlRate) },
          ],
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Save failed'); return }
      setSaved(true)
      router.refresh()
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">💰</span>
          <h2 className="font-semibold text-base">Court Fees</h2>
        </div>
        <p className="text-xs text-zinc-500 mb-5">
          Members always play free. These rates apply to non-member (guest) bookings only.
        </p>

        <form onSubmit={handleSave} className="flex flex-col gap-5">

          {/* Master toggle */}
          <div className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-colors ${
            enabled ? 'border-emerald-400 bg-emerald-50' : 'border-zinc-200 bg-zinc-50'
          }`}>
            <div>
              <p className="text-sm font-semibold text-zinc-800 flex items-center gap-1.5">
                {enabled ? '✅ Monetization is ON' : '⏸ Monetization is OFF'}
                {!isSuperAdmin && <span className="text-xs font-normal text-zinc-400">🔒 Super admin only</span>}
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">
                {enabled
                  ? 'Non-members must pay via GCash before booking confirms.'
                  : 'Guest booking is disabled. Members only.'}
              </p>
            </div>
            {isSuperAdmin ? (
              <button
                type="button"
                onClick={() => { setEnabled(e => !e); setSaved(false) }}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${
                  enabled ? 'bg-emerald-500' : 'bg-zinc-300'
                }`}
                role="switch"
                aria-checked={enabled}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  enabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            ) : (
              // Read-only indicator for non-super admins
              <div className={`relative inline-flex h-7 w-12 items-center rounded-full opacity-50 cursor-not-allowed ${
                enabled ? 'bg-emerald-500' : 'bg-zinc-300'
              }`}>
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ${
                  enabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </div>
            )}
          </div>

          {/* Fee inputs — visually dimmed when monetization is off */}
          <div className={`flex flex-col gap-4 transition-opacity ${enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Rates (per hour)</p>
            {fees.map(fee => (
              <label key={fee.key} className="flex items-center justify-between gap-4">
                <span className="text-sm text-zinc-700 flex items-center gap-2">
                  <span>{SPORT_ICON[fee.key]}</span>
                  {fee.label}
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-zinc-400">₱</span>
                  <input
                    type="number"
                    min={0}
                    step={50}
                    value={fee.value}
                    onChange={e => updateFee(fee.key, e.target.value)}
                    className="w-24 px-3 py-2 border border-zinc-200 rounded-xl text-sm text-right outline-none focus:ring-2 focus:ring-black bg-white"
                  />
                  <span className="text-xs text-zinc-400">/hr</span>
                </div>
              </label>
            ))}
          </div>

          {/* BPTL Rates */}
          <div className="flex flex-col gap-4">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">BPTL Rates</p>
            <label className="flex items-center justify-between gap-4">
              <span className="text-sm text-zinc-700 flex items-center gap-2">
                <span>🎾</span>
                BPTL Tennis — Daily Access Rate
              </span>
              <div className="flex items-center gap-1">
                <span className="text-sm text-zinc-400">₱</span>
                <input
                  type="number"
                  min={0}
                  step={10}
                  value={bptlRate}
                  onChange={e => { setBptlRate(Number(e.target.value) || 0); setSaved(false) }}
                  className="w-24 px-3 py-2 border border-zinc-200 rounded-xl text-sm text-right outline-none focus:ring-2 focus:ring-black bg-white"
                />
                <span className="text-xs text-zinc-400">/day</span>
              </div>
            </label>
            <p className="text-xs text-zinc-400">Multipurpose court uses standard non-member rates above for BPTL members.</p>
          </div>

          {error && <p className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-xl">{error}</p>}

          <div className="flex items-center gap-3">
            <Button type="submit" loading={loading} className="flex-1">
              Save settings
            </Button>
            {saved && <span className="text-sm text-emerald-600 font-medium">✓ Saved</span>}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
