'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function MemberActions({
  memberId,
  currentStatus,
}: {
  memberId: string
  currentStatus: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function updateStatus(status: string) {
    setLoading(true)
    await fetch(`/api/admin/members/${memberId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setLoading(false)
    router.refresh()
  }

  async function deleteMember() {
    if (!confirm('Delete this member? This cannot be undone.')) return
    setLoading(true)
    await fetch(`/api/admin/members/${memberId}`, { method: 'DELETE' })
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="flex gap-2 flex-wrap mt-1">
      {currentStatus !== 'active' && (
        <button
          onClick={() => updateStatus('active')}
          disabled={loading}
          className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100"
        >
          Activate
        </button>
      )}
      {currentStatus !== 'suspended' && (
        <button
          onClick={() => updateStatus('suspended')}
          disabled={loading}
          className="text-xs px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100"
        >
          Suspend
        </button>
      )}
      <button
        onClick={deleteMember}
        disabled={loading}
        className="text-xs px-2.5 py-1 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
      >
        Delete
      </button>
    </div>
  )
}
