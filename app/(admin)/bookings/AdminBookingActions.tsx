'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  bookingId: string
  status: string
}

export default function AdminBookingActions({ bookingId, status }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<'cancel' | 'paid' | null>(null)

  async function markPaid() {
    if (!confirm('Mark this booking as paid (in-person cash payment)?')) return
    setLoading('paid')
    await fetch(`/api/bookings/${bookingId}`, { method: 'PATCH' })
    setLoading(null)
    router.refresh()
  }

  async function cancel() {
    if (!confirm('Cancel this booking?')) return
    setLoading('cancel')
    await fetch(`/api/bookings/${bookingId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Cancelled by admin' }),
    })
    setLoading(null)
    router.refresh()
  }

  if (status === 'cancelled' || status === 'completed') return null

  return (
    <div className="flex items-center gap-3">
      {status === 'pending_payment' && (
        <button
          onClick={markPaid}
          disabled={loading !== null}
          className="text-xs text-emerald-600 hover:underline font-medium disabled:opacity-50"
        >
          {loading === 'paid' ? 'Saving…' : 'Mark as Paid'}
        </button>
      )}
      <button
        onClick={cancel}
        disabled={loading !== null}
        className="text-xs text-red-500 hover:underline disabled:opacity-50"
      >
        {loading === 'cancel' ? 'Cancelling…' : 'Cancel'}
      </button>
    </div>
  )
}
