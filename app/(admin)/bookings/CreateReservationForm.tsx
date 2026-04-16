'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { SportType } from '@/services/booking/types'

interface Court {
  id: string
  name: string
  courtType: string
}

interface Member {
  id: string
  memberId: string
  fullName: string
  email: string
}

export default function CreateReservationForm() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [selectedCourtId, setSelectedCourtId] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [sportType, setSportType] = useState<SportType>('tennis')

  const [courts, setCourts] = useState<Court[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  const sportTypes: SportType[] = ['tennis', 'basketball', 'pickleball']

  const openForm = async () => {
    setOpen(true)
    setError('')
    setSuccess('')

    // Fetch courts and members
    try {
      const [courtsRes, membersRes] = await Promise.all([
        fetch('/api/courts'),
        fetch('/api/admin/members'),
      ])
      if (courtsRes.ok) setCourts(await courtsRes.json().then(r => r.courts))
      if (membersRes.ok) setMembers(await membersRes.json().then(r => r.members))
    } catch (err) {
      setError('Failed to load courts and members')
    }
  }

  const handleSearchMembers = async (query: string) => {
    setSearchQuery(query)
    if (!query) {
      setMembers([])
      return
    }
    try {
      const res = await fetch(`/api/admin/members?search=${encodeURIComponent(query)}`)
      if (res.ok) {
        const data = await res.json()
        setMembers(data.members)
      }
    } catch (err) {
      setError('Failed to search members')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!selectedMemberId || !selectedCourtId || !selectedDate || !startTime || !endTime) {
      setError('Please fill in all fields')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courtId: selectedCourtId,
          sportType,
          slots: [{
            date: selectedDate,
            startTime,
            endTime,
          }],
          memberId: selectedMemberId,
          adminOverride: true,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to create reservation')
        return
      }

      // Check for succeeded bookings
      if (data.succeeded && data.succeeded.length > 0) {
        setSuccess('Reservation created successfully!')
        // Reset form
        setSelectedMemberId('')
        setSelectedCourtId('')
        setSelectedDate('')
        setStartTime('')
        setEndTime('')
        setSportType('tennis')
        setSearchQuery('')
        setTimeout(() => {
          setOpen(false)
          window.location.reload()
        }, 1500)
      } else if (data.failed && data.failed.length > 0) {
        setError(`Failed: ${data.failed[0].reason}`)
      }
    } catch (err) {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={openForm}
        className="px-4 py-2 bg-black text-white rounded-xl text-sm font-medium hover:bg-zinc-800 transition-colors"
      >
        + New Reservation
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-zinc-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-lg font-semibold">Create Reservation</h2>
          <button
            onClick={() => setOpen(false)}
            className="text-zinc-400 hover:text-zinc-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {/* Member search */}
          <div>
            <label className="text-sm font-medium text-zinc-700 block mb-1">Member</label>
            <input
              type="text"
              placeholder="Search by name, email, or ID..."
              value={searchQuery}
              onChange={(e) => handleSearchMembers(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm outline-none"
            />
            {searchQuery && members.length > 0 && (
              <div className="mt-2 border border-zinc-200 rounded-xl max-h-40 overflow-y-auto">
                {members.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setSelectedMemberId(m.id)
                      setSearchQuery(m.fullName)
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-zinc-50 border-b border-zinc-100 last:border-b-0 text-sm"
                  >
                    <p className="font-medium">{m.fullName}</p>
                    <p className="text-xs text-zinc-500">{m.email}</p>
                  </button>
                ))}
              </div>
            )}
            {selectedMemberId && (
              <p className="text-xs text-green-600 mt-1">✓ Member selected</p>
            )}
          </div>

          {/* Court select */}
          <div>
            <label className="text-sm font-medium text-zinc-700 block mb-1">Court</label>
            <select
              value={selectedCourtId}
              onChange={(e) => setSelectedCourtId(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm outline-none bg-white"
            >
              <option value="">Select a court</option>
              {courts.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="text-sm font-medium text-zinc-700 block mb-1">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm outline-none"
            />
          </div>

          {/* Time slots */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-zinc-700 block mb-1">Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-700 block mb-1">End Time</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm outline-none"
              />
            </div>
          </div>

          {/* Sport type */}
          <div>
            <label className="text-sm font-medium text-zinc-700 block mb-1">Sport Type</label>
            <div className="flex gap-2">
              {sportTypes.map(sport => (
                <button
                  key={sport}
                  type="button"
                  onClick={() => setSportType(sport)}
                  className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-colors capitalize ${
                    sportType === sport
                      ? 'bg-black text-white'
                      : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                  }`}
                >
                  {sport}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{error}</p>
          )}

          {success && (
            <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-xl">{success}</p>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-1 px-4 py-2 border border-zinc-200 text-zinc-700 rounded-xl text-sm font-medium hover:bg-zinc-50 transition-colors"
            >
              Cancel
            </button>
            <Button
              type="submit"
              loading={loading}
              className="flex-1"
            >
              Create
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
