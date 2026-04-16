import { requireActiveMember } from '@/lib/auth'
import { Card, CardContent } from '@/components/ui/card'
import { statusBadge } from '@/components/ui/badge'
import LogoutButton from './LogoutButton'

export default async function ProfilePage() {
  const profile = await requireActiveMember()

  const rows = [
    { label: 'Full name',  value: profile.fullName },
    { label: 'Email',      value: profile.email },
    { label: 'Phone',      value: profile.phone ?? '—' },
    { label: 'Member ID',  value: profile.memberId ?? '—', mono: true },
    { label: 'Status',     value: statusBadge(profile.status) },
  ]

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Profile</h1>

      <Card className="mb-4">
        <CardContent className="pt-4 flex flex-col gap-4">
          {rows.map(row => (
            <div key={row.label} className="flex justify-between items-center py-1 border-b border-zinc-50 last:border-0">
              <span className="text-sm text-zinc-500">{row.label}</span>
              {typeof row.value === 'string'
                ? <span className={`text-sm font-medium ${row.mono ? 'font-mono' : ''}`}>{row.value}</span>
                : row.value
              }
            </div>
          ))}
        </CardContent>
      </Card>

      <LogoutButton />
    </div>
  )
}
