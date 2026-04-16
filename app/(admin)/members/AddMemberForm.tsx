'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function AddMemberForm({ viewerIsSuperAdmin }: { viewerIsSuperAdmin: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('active')
  const [role, setRole] = useState('member')

  const reset = () => {
    setFullName('')
    setEmail('')
    setPhone('')
    setPassword('')
    setStatus('active')
    setRole('member')
    setError('')
    setSuccess('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!fullName || !email || !password) {
      setError('Full name, email and password are required')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/admin/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, phone, password, status, role }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to create member')
        return
      }
      setSuccess(`Member created — ID: ${data.member.memberId}`)
      reset()
      setTimeout(() => {
        setOpen(false)
        router.refresh()
      }, 1500)
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => { reset(); setOpen(true) }}
        className="px-4 py-2 bg-black text-white rounded-xl text-sm font-medium hover:bg-zinc-800 transition-colors"
      >
        + Add Member
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-zinc-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-lg font-semibold">Add Member</h2>
          <button onClick={() => setOpen(false)} className="text-zinc-400 hover:text-zinc-600">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-zinc-700 block mb-1">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Jane Smith"
              className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm outline-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-700 block mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="jane@example.com"
              className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm outline-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-700 block mb-1">Phone <span className="text-zinc-400 font-normal">(optional)</span></label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+1 234 567 8900"
              className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm outline-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-700 block mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Set initial password"
              className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm outline-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-700 block mb-1">Role</label>
            <select
              value={role}
              onChange={e => setRole(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm outline-none bg-white"
            >
              <option value="member">Member</option>
              {viewerIsSuperAdmin && <option value="admin">Admin</option>}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-700 block mb-1">Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm outline-none bg-white"
            >
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}
          {success && <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-xl">{success}</p>}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-1 px-4 py-2 border border-zinc-200 text-zinc-700 rounded-xl text-sm font-medium hover:bg-zinc-50 transition-colors"
            >
              Cancel
            </button>
            <Button type="submit" loading={loading} className="flex-1">Create</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
