'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function AdminCheckinPage() {
  const [token, setToken]   = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  async function handleCheckin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrToken: token.trim() }),
      })
      const data = await res.json()
      setResult({ ok: res.ok, ...data })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-sm mx-auto">
      <h1 className="text-2xl font-semibold mb-2">QR Check-in</h1>
      <p className="text-zinc-500 text-sm mb-6">Enter or scan the member's QR token</p>

      <form onSubmit={handleCheckin} className="flex flex-col gap-4">
        <Input
          id="token"
          label="QR Token"
          placeholder="e.g. aB3xK9mNpQ2r"
          value={token}
          onChange={e => setToken(e.target.value)}
          required
          autoFocus
          className="font-mono"
        />
        <Button type="submit" loading={loading} size="lg" className="w-full">
          Process check-in
        </Button>
      </form>

      {result && (
        <Card className="mt-6">
          <CardContent className="pt-4">
            {result.ok ? (
              <div className="text-center">
                <div className="text-4xl mb-3">✅</div>
                <p className="font-semibold text-emerald-700">Checked in!</p>
                {result.memberName && <p className="text-sm text-zinc-600 mt-1">{result.memberName}</p>}
                <button
                  onClick={() => { setToken(''); setResult(null) }}
                  className="text-sm text-zinc-400 mt-4 hover:text-zinc-700"
                >
                  Check in another
                </button>
              </div>
            ) : (
              <div className="text-center">
                <div className="text-4xl mb-3">❌</div>
                <p className="font-semibold text-red-600">Check-in failed</p>
                <p className="text-sm text-zinc-500 mt-1">{result.error}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
