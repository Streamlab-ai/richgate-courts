import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'
import { Card, CardContent } from '@/components/ui/card'
import { statusBadge } from '@/components/ui/badge'
import MemberActions from './MemberActions'
import AddMemberForm from './AddMemberForm'

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string }>
}) {
  const me = await requireAdmin()
  const viewerIsSuperAdmin = me.role === 'super_admin'
  const { search = '', status } = await searchParams

  const members = await db.profile.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(search ? {
        OR: [
          { fullName: { contains: search } },
          { email: { contains: search } },
          { memberId: { contains: search } },
        ],
      } : {}),
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Members</h1>
        <AddMemberForm viewerIsSuperAdmin={viewerIsSuperAdmin} />
      </div>

      {/* Filters */}
      <form className="flex gap-2 mb-6">
        <input
          name="search"
          defaultValue={search}
          placeholder="Search name / email / ID…"
          className="flex-1 px-4 py-2.5 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black bg-white"
        />
        <select
          name="status"
          defaultValue={status ?? ''}
          className="px-3 py-2.5 border border-zinc-200 rounded-xl text-sm outline-none bg-white"
        >
          <option value="">All</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="suspended">Suspended</option>
          <option value="rejected">Rejected</option>
        </select>
        <button type="submit" className="px-4 py-2.5 bg-black text-white rounded-xl text-sm">Go</button>
      </form>

      <p className="text-sm text-zinc-500 mb-4">{members.length} member{members.length !== 1 ? 's' : ''}</p>

      <div className="flex flex-col gap-3">
        {members.map(m => (
          <Card key={m.id}>
            <CardContent className="pt-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-medium flex flex-wrap items-center gap-1">
                    {m.fullName}
                    {m.role === 'super_admin'
                      ? <span className="text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded-md font-medium">⭐ Super Admin</span>
                      : m.role === 'admin'
                        ? <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-md font-medium">Admin</span>
                        : m.role === 'guard'
                          ? <span className="text-xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-md font-medium">Guard</span>
                          : m.role === 'bptl'
                            ? <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-md font-medium">BPTL</span>
                            : <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-md font-medium">HOA</span>
                    }
                  </p>
                  <p className="text-sm text-zinc-500">{m.email}</p>
                  {m.memberId && <p className="text-xs font-mono text-zinc-400 mt-0.5">{m.memberId}</p>}
                </div>
                {statusBadge(m.status)}
              </div>
              <MemberActions
                memberId={m.id}
                currentStatus={m.status}
                currentFullName={m.fullName}
                currentEmail={m.email}
                currentPhone={m.phone}
                currentRole={m.role}
                isSuperAdmin={m.role === 'super_admin'}
                targetIsAdmin={m.role === 'admin' || m.role === 'super_admin'}
                viewerIsSuperAdmin={viewerIsSuperAdmin}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
