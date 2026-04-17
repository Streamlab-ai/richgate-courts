import { redirect } from 'next/navigation'
import { getSession, type SessionPayload } from '@/lib/session'
import { db } from '@/lib/db'

// Used by startup.ts seed to identify the super admin row — do not remove
export const SUPER_ADMIN_MEMBER_ID = 'RG-000001'

// ─────────────────────────────────────────────────────────────────────────────
// DB-based auth (full profile) — use when the page needs profile data
// ─────────────────────────────────────────────────────────────────────────────

export async function getProfile() {
  const session = await getSession()
  if (!session) return null
  const profile = await db.profile.findUnique({ where: { id: session.sub } })
  return profile ?? null
}

export function isAdmin(profile: { role: string } | null): boolean {
  return profile?.role === 'admin' || profile?.role === 'super_admin'
}

export function isSuperAdmin(profile: { role: string } | null): boolean {
  return profile?.role === 'super_admin'
}

export function isActiveMember(profile: { role: string; status: string } | null): boolean {
  return (profile?.role === 'hoa' || profile?.role === 'bptl') && profile?.status === 'active'
}

export function isBptlMember(profile: { role: string } | null): boolean {
  return profile?.role === 'bptl'
}

export function isGuard(profile: { role: string } | null): boolean {
  return profile?.role === 'guard'
}

export function isPending(profile: { status: string } | null): boolean {
  return profile?.status === 'pending'
}

export async function requireAuth() {
  const profile = await getProfile()
  if (!profile) redirect('/login')
  return profile
}

export async function requireActiveMember() {
  const profile = await getProfile()
  if (!profile) redirect('/login')
  const isAdmin = profile.role === 'admin' || profile.role === 'super_admin'
  if (!isAdmin && profile.role !== 'hoa' && profile.role !== 'bptl') redirect('/login')
  if (!isAdmin) {
    if (profile.status === 'pending') redirect('/pending')
    if (profile.status !== 'active') redirect('/login')
  }
  return profile
}

export async function requireAdmin() {
  const profile = await getProfile()
  if (!profile) redirect('/login')
  if (profile.role !== 'admin' && profile.role !== 'super_admin') redirect('/home')
  return profile
}

export async function requireSuperAdmin() {
  const profile = await getProfile()
  if (!profile) redirect('/login')
  if (profile.role !== 'admin' && profile.role !== 'super_admin') redirect('/home')
  if (profile.role !== 'super_admin') redirect('/dashboard')
  return profile
}

export async function requireGuardOrAdmin() {
  const profile = await getProfile()
  if (!profile) redirect('/login')
  if (profile.role !== 'guard' && profile.role !== 'admin' && profile.role !== 'super_admin') redirect('/home')
  return profile
}

export async function requireGuest(): Promise<void> {
  const profile = await getProfile()
  if (!profile) return
  if (profile.role === 'guard') redirect('/guard')
  if (profile.role === 'admin' || profile.role === 'super_admin') redirect('/dashboard')
  if (profile.status === 'active') redirect('/home')
  if (profile.status === 'pending') redirect('/pending')
  redirect('/login')
}

// ─────────────────────────────────────────────────────────────────────────────
// JWT-only auth (no DB query) — use when the page fetches its own profile
// data alongside other queries via Promise.all.  ~50-100ms faster per page.
// ─────────────────────────────────────────────────────────────────────────────

/** Auth gate for member pages. Returns JWT session (no DB hit). */
export async function requireMemberSession(): Promise<SessionPayload> {
  const session = await getSession()
  if (!session) redirect('/login')
  const adm = session.role === 'admin' || session.role === 'super_admin'
  if (!adm && session.role !== 'hoa' && session.role !== 'bptl') redirect('/login')
  if (!adm) {
    if (session.status === 'pending') redirect('/pending')
    if (session.status !== 'active') redirect('/login')
  }
  return session
}

/** Auth gate for admin pages. Returns JWT session (no DB hit). */
export async function requireAdminSession(): Promise<SessionPayload> {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'admin' && session.role !== 'super_admin') redirect('/home')
  return session
}

/** Auth gate for guard-or-admin pages. Returns JWT session (no DB hit). */
export async function requireGuardOrAdminSession(): Promise<SessionPayload> {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'guard' && session.role !== 'admin' && session.role !== 'super_admin') redirect('/home')
  return session
}
