import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'
import { Card, CardContent } from '@/components/ui/card'
import { statusBadge } from '@/components/ui/badge'
import RegistrationActions from './RegistrationActions'

export default async function AdminRegistrationsPage() {
  await requireAdmin()

  const registrations = await db.registrationRequest.findMany({
    where: { status: 'pending' },
    include: {
      profile: { select: { id: true, fullName: true, email: true, phone: true, createdAt: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-2">Registrations</h1>
      <p className="text-zinc-500 text-sm mb-6">{registrations.length} pending</p>

      {registrations.length === 0 && (
        <div className="text-center py-12 text-zinc-400">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-sm">No pending registrations</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {registrations.map(reg => (
          <Card key={reg.id}>
            <CardContent className="pt-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-medium">{reg.profile.fullName}</p>
                  <p className="text-sm text-zinc-500">{reg.profile.email}</p>
                  {reg.profile.phone && <p className="text-xs text-zinc-400">{reg.profile.phone}</p>}
                  <p className="text-xs text-zinc-300 mt-1">
                    Applied {new Date(reg.profile.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {statusBadge(reg.status)}
              </div>
              <RegistrationActions registrationId={reg.id} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
