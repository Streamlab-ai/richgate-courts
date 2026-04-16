'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CancelBookingButton({ bookingId }: { bookingId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [confirm, setConfirm] = useState(false)

  async function handleCancel() {
    setLoading(true)
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Cancelled by member' }),
      })
      if (res.ok) router.refresh()
    } finally {
      setLoading(false)
      setConfirm(false)
    }
  }

  if (confirm) {
    return (
      <div className="flex gap-2 mt-2">
        <button
          onClick={handleCancel}
          disabled={loading}
          className="text-xs text-white bg-red-500 px-3 py-1.5 rounded-lg"
        >
          {loading ? 'Cancelling…' : 'Yes, cancel'}
        </button>
        <button
          onClick={() => setConfirm(false)}
          className="text-xs text-zinc-500 px-3 py-1.5 rounded-lg bg-zinc-100"
        >
          Keep it
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="text-xs text-red-500 hover:underline mt-1"
    >
      Cancel booking
    </button>
  )
}
