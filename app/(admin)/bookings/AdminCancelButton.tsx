'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminCancelButton({ bookingId }: { bookingId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function cancel() {
    if (!confirm('Cancel this booking?')) return
    setLoading(true)
    await fetch(`/api/bookings/${bookingId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Cancelled by admin' }),
    })
    setLoading(false)
    router.refresh()
  }

  return (
    <button
      onClick={cancel}
      disabled={loading}
      className="text-xs text-red-500 hover:underline"
    >
      {loading ? 'Cancelling…' : 'Cancel'}
    </button>
  )
}
