'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export default function RegistrationActions({ registrationId }: { registrationId: string }) {
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState('')

  async function handle(action: 'approve' | 'reject') {
    setLoading(action)
    setError('')
    try {
      const res = await fetch('/api/admin/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId, action, notes: notes || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong')
        return
      }
      setDone(action === 'approve' ? `✅ Approved — ID: ${data.memberId}` : '❌ Rejected')
      setTimeout(() => window.location.reload(), 1200)
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(null)
    }
  }

  if (done) {
    return <p className="text-sm font-medium text-zinc-600 py-1">{done}</p>
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        placeholder="Optional notes"
        value={notes}
        onChange={e => setNotes(e.target.value)}
        className="text-sm px-3 py-2 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black"
      />
      {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => handle('approve')}
          loading={loading === 'approve'}
          className="flex-1"
        >
          Approve
        </Button>
        <Button
          size="sm"
          variant="danger"
          onClick={() => handle('reject')}
          loading={loading === 'reject'}
          className="flex-1"
        >
          Reject
        </Button>
      </div>
    </div>
  )
}
