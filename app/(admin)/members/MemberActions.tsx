'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface Props {
  memberId: string
  currentStatus: string
  currentFullName: string
  currentEmail: string
  currentPhone: string | null
  currentRole: string
  isSuperAdmin: boolean       // this member IS the super admin
  targetIsAdmin: boolean      // this member has admin role
  viewerIsSuperAdmin: boolean // the logged-in user is super admin
}

export default function MemberActions({
  memberId,
  currentStatus,
  currentFullName,
  currentEmail,
  currentPhone,
  currentRole,
  isSuperAdmin,
  targetIsAdmin,
  viewerIsSuperAdmin,
}: Props) {
  // Password field is hidden when target is an admin and viewer is not super admin
  const canChangePassword = !targetIsAdmin || viewerIsSuperAdmin
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  const [fullName, setFullName] = useState(currentFullName)
  const [email, setEmail] = useState(currentEmail)
  const [phone, setPhone] = useState(currentPhone ?? '')
  const [status, setStatus] = useState(currentStatus)
  const [role, setRole] = useState(currentRole)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const body: Record<string, string> = { fullName, email, phone, status, role }
    if (password) body.password = password

    const res = await fetch(`/api/admin/members/${memberId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? 'Failed to save'); return }
    setEditOpen(false)
    router.refresh()
  }

  async function deleteMember() {
    if (!confirm('Delete this member? This cannot be undone.')) return
    setLoading(true)
    const res = await fetch(`/api/admin/members/${memberId}`, { method: 'DELETE' })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { alert(data.error ?? 'Failed to delete'); return }
    router.refresh()
  }

  return (
    <>
      <div className="flex gap-2 flex-wrap mt-1">
        <button
          onClick={() => {
            setFullName(currentFullName)
            setEmail(currentEmail)
            setPhone(currentPhone ?? '')
            setStatus(currentStatus)
            setRole(currentRole)
            setPassword('')
            setError('')
            setEditOpen(true)
          }}
          className="text-xs px-2.5 py-1 bg-zinc-100 text-zinc-700 rounded-lg hover:bg-zinc-200"
        >
          Edit
        </button>
        {!isSuperAdmin && (
          <button
            onClick={deleteMember}
            disabled={loading}
            className="text-xs px-2.5 py-1 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
          >
            Delete
          </button>
        )}
      </div>

      {editOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-zinc-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-semibold">Edit Member</h2>
              <button onClick={() => setEditOpen(false)} className="text-zinc-400 hover:text-zinc-600">✕</button>
            </div>

            <form onSubmit={handleSave} className="p-6 flex flex-col gap-4">
              <div>
                <label className="text-sm font-medium text-zinc-700 block mb-1">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm outline-none"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-zinc-700 block mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm outline-none"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-zinc-700 block mb-1">Phone <span className="text-zinc-400 font-normal">(optional)</span></label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm outline-none"
                />
              </div>

              {canChangePassword ? (
                <div>
                  <label className="text-sm font-medium text-zinc-700 block mb-1">New Password <span className="text-zinc-400 font-normal">(leave blank to keep current)</span></label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm outline-none"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-400">
                  🔒 Password changes for admin accounts require super admin access
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-zinc-700 block mb-1">Role</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  disabled={isSuperAdmin}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm outline-none bg-white disabled:opacity-50"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-zinc-700 block mb-1">Status</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  disabled={isSuperAdmin}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm outline-none bg-white disabled:opacity-50"
                >
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="suspended">Suspended</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="flex-1 px-4 py-2 border border-zinc-200 text-zinc-700 rounded-xl text-sm font-medium hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <Button type="submit" loading={loading} className="flex-1">Save</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
