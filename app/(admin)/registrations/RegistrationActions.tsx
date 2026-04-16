'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function RegistrationActions({ registrationId }: { registrationId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null)
  const [notes, setNotes] = useState('')

  async function handle(action: 'approve' | 'reject') {
    setLoading(action)
    try {
      await fetch('/api/admin/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId, action, notes: notes || undefined }),
      })
      router.refresh()
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        placeholder="Optional notes"
        value={notes}
        onChange={e => setNotes(e.target.value)}
        className="text-sm px-3 py-2 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black"
      />
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
