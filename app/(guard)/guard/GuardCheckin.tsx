'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

export default function GuardCheckin() {
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; memberName?: string; bookingId?: string; error?: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token.trim()) return
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrToken: token.trim() }),
      })
      const data = await res.json()
      setResult(data)
      if (data.ok) setToken('')
    } catch {
      setResult({ ok: false, error: 'Network error — please try again' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-zinc-100 p-4 flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-zinc-700">QR Check-in</h2>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={token}
          onChange={e => setToken(e.target.value)}
          placeholder="Enter QR token"
          className="flex-1 px-3 py-2 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black bg-white font-mono"
          autoComplete="off"
          spellCheck={false}
        />
        <Button type="submit" loading={loading} className="shrink-0">Verify</Button>
      </form>
      {result && (
        <div className={`px-3 py-2.5 rounded-xl text-sm font-medium ${
          result.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
        }`}>
          {result.ok ? `✓ Access granted — ${result.memberName}` : `✗ ${result.error ?? 'Access denied'}`}
        </div>
      )}
    </div>
  )
}
