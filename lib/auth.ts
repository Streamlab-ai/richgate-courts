import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE (with role + status)
// Returns the profiles row for the current JWT session user, or null.
// ─────────────────────────────────────────────────────────────────────────────
export async function getProfile() {
  const session = await getSession()
  if (!session) return null

  const profile = await db.profile.findUnique({ where: { id: session.sub } })
  return profile ?? null
}

// ─────────────────────────────────────────────────────────────────────────────
// ROLE / STATUS PREDICATES
// ─────────────────────────────────────────────────────────────────────────────
export function isAdmin(profile: { role: string } | null): boolean {
  return profile?.role === 'admin'
}

// Super admin is identified by the fixed seed memberId — cannot be deleted or demoted.
export const SUPER_ADMIN_MEMBER_ID = 'RG-000001'

export function isSuperAdmin(profile: { memberId?: string | null } | null): boolean {
  return profile?.memberId === SUPER_ADMIN_MEMBER_ID
}

export function isActiveMember(profile: { status: string } | null): boolean {
  return profile?.status === 'active'
}

export function isBptlMember(profile: { memberType?: string | null } | null): boolean {
  return profile?.memberType === 'bptl'
}

export function isGuard(profile: { role: string } | null): boolean {
  return profile?.role === 'guard'
}

/**
 * requireGuardOrAdmin — must be guard or admin.
 */
export async function requireGuardOrAdmin() {
  const profile = await getProfile()
  if (!profile) redirect('/login')
  if (profile.role !== 'admin' && profile.role !== 'guard') redirect('/home')
  return profile
}

export function isPending(profile: { status: string } | null): boolean {
  return profile?.status === 'pending'
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE GUARDS (use in Server Components / page.tsx files)
//
// These redirect immediately — call them at the top of any protected page.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * requireAuth — must be authenticated.
 * Redirects to /login if not signed in.
 */
export async function requireAuth() {
  const profile = await getProfile()
  if (!profile) redirect('/login')
  return profile
}

/**
 * requireActiveMember — must be authenticated AND have status='active'.
 * Pending users are sent to /pending.
 * Inactive/suspended users are sent to /login.
 */
export async function requireActiveMember() {
  const profile = await getProfile()
  if (!profile) redirect('/login')
  if (profile.status === 'pending') redirect('/pending')
  if (profile.status !== 'active') redirect('/login')
  return profile
}

/**
 * requireAdmin — must be authenticated AND have role='admin'.
 * Non-admins are sent to /home (or /login if unauthenticated).
 */
export async function requireAdmin() {
  const profile = await getProfile()
  if (!profile) redirect('/login')
  if (profile.role !== 'admin') redirect('/home')
  return profile
}

/**
 * requireSuperAdmin — must be the super admin (RG-000001).
 * Regular admins are sent to /dashboard.
 */
export async function requireSuperAdmin() {
  const profile = await getProfile()
  if (!profile) redirect('/login')
  if (profile.role !== 'admin') redirect('/home')
  if (!isSuperAdmin(profile)) redirect('/dashboard')
  return profile
}

/**
 * requireGuest — must NOT be authenticated.
 * Already-authenticated users are redirected to the right landing page.
 */
export async function requireGuest(): Promise<void> {
  const profile = await getProfile()
  if (!profile) return

  if (profile.role === 'guard') redirect('/guard')
  if (profile.role === 'admin') redirect('/dashboard')
  if (profile.status === 'active') redirect('/home')
  if (profile.status === 'pending') redirect('/pending')
  redirect('/login')
}
