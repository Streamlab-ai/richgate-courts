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

export function isActiveMember(profile: { status: string } | null): boolean {
  return profile?.status === 'active'
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
 * requireGuest — must NOT be authenticated.
 * Already-authenticated users are redirected to the right landing page.
 */
export async function requireGuest(): Promise<void> {
  const profile = await getProfile()
  if (!profile) return

  if (profile.role === 'admin') redirect('/dashboard')
  if (profile.status === 'active') redirect('/home')
  if (profile.status === 'pending') redirect('/pending')
  redirect('/login')
}
