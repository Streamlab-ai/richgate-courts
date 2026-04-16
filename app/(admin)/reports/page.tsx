'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'

type ReportType = 'utilization' | 'members' | 'waitlist' | 'checkin'

export default function AdminReportsPage() {
  const [type, setType]   = useState<ReportType>('utilization')
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [data, setData]   = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/reports?type=${type}&month=${month}`)
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [type, month])

  const tabs: { key: ReportType; label: string }[] = [
    { key: 'utilization', label: 'Utilization' },
    { key: 'members',     label: 'Top Members' },
    { key: 'waitlist',    label: 'Waitlist' },
    { key: 'checkin',     label: 'Check-ins' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Reports</h1>
        <input
          type="month"
          value={month}
          onChange={e => setMonth(e.target.value)}
          className="text-sm border border-zinc-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-black"
        />
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl mb-6 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setType(t.key)}
            className={`flex-1 text-sm py-1.5 px-2 rounded-lg whitespace-nowrap transition-all ${
              type === t.key ? 'bg-white shadow-sm font-medium' : 'text-zinc-500'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-center text-zinc-400 py-10">Loading…</p>}

      {!loading && data && (
        <>
          {/* Utilization */}
          {type === 'utilization' && (
            <div className="flex flex-col gap-3">
              {(data.data ?? []).map((row: any) => (
                <Card key={row.court + row.sportType}>
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-sm">{row.court}</p>
                        <p className="text-xs text-zinc-500 capitalize">{row.sportType}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{row.totalHours}h</p>
                        <p className="text-xs text-zinc-400">{row.bookingCount} bookings</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {(data.data ?? []).length === 0 && <p className="text-center text-zinc-400 py-8 text-sm">No data for this month</p>}
            </div>
          )}

          {/* Top Members */}
          {type === 'members' && (
            <div className="flex flex-col gap-2">
              {(data.data ?? []).map((m: any, i: number) => (
                <Card key={m.id}>
                  <CardContent className="pt-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-zinc-300">{i + 1}</span>
                        <div>
                          <p className="text-sm font-medium">{m.fullName}</p>
                          <p className="text-xs font-mono text-zinc-400">{m.memberId}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">{m.totalHours}h</p>
                        <p className="text-xs text-zinc-400">{m.bookingCount} bookings</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Waitlist */}
          {type === 'waitlist' && data.summary && (
            <div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {Object.entries(data.summary).map(([key, val]) => (
                  <Card key={key}>
                    <CardContent className="pt-4">
                      <p className="text-2xl font-bold">{val as number}</p>
                      <p className="text-xs text-zinc-500 capitalize">{key}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Check-ins */}
          {type === 'checkin' && (
            <div>
              <Card className="mb-4">
                <CardContent className="pt-4">
                  <p className="text-3xl font-bold">{data.count ?? 0}</p>
                  <p className="text-xs text-zinc-500 mt-1">Total check-ins this month</p>
                </CardContent>
              </Card>
              <div className="flex flex-col gap-2">
                {(data.checkins ?? []).slice(0, 20).map((c: any) => (
                  <Card key={c.id}>
                    <CardContent className="pt-3">
                      <p className="text-sm font-medium">{c.member.fullName}</p>
                      <p className="text-xs text-zinc-400">
                        {c.booking?.court?.name} · {c.booking?.date} {c.booking?.startTime} · {c.method}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
