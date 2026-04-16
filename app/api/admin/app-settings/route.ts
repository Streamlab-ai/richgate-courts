// GET  /api/admin/app-settings  — returns all settings (seeds defaults if missing)
// PATCH /api/admin/app-settings — updates one or more settings

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { SUPER_ADMIN_MEMBER_ID } from '@/lib/auth'

// Default settings seeded on first read
const DEFAULTS: { key: string; value: string; label: string }[] = [
  { key: 'monetization_enabled',       value: 'false', label: 'Monetization (charge non-members)' },
  { key: 'price_per_hour_tennis',      value: '200',   label: 'Tennis — Price per Hour (₱)' },
  { key: 'price_per_hour_pickleball',  value: '200',   label: 'Pickleball — Price per Hour (₱)' },
  { key: 'price_per_hour_basketball',  value: '400',   label: 'Basketball — Price per Hour (₱)' },
]

async function ensureDefaults() {
  for (const d of DEFAULTS) {
    await db.appSetting.upsert({
      where: { key: d.key },
      update: {},            // don't overwrite if already exists
      create: d,
    })
  }
}

function adminOnly(session: Awaited<ReturnType<typeof getSession>>) {
  return !session || session.role !== 'admin'
}

export async function GET() {
  const session = await getSession()
  if (adminOnly(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await ensureDefaults()
  const settings = await db.appSetting.findMany({ orderBy: { key: 'asc' } })
  return NextResponse.json({ settings })
}

export async function PATCH(request: NextRequest) {
  const session = await getSession()
  if (adminOnly(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  // body: { updates: [ { key, value }, ... ] }
  const { updates } = body as { updates: { key: string; value: string }[] }

  if (!Array.isArray(updates) || updates.length === 0) {
    return NextResponse.json({ error: 'updates array is required' }, { status: 400 })
  }

  // Check if caller is super admin (needed for monetization_enabled)
  const me = await db.profile.findUnique({ where: { id: session!.sub }, select: { memberId: true } })
  const callerIsSuperAdmin = me?.memberId === SUPER_ADMIN_MEMBER_ID

  // Validate — only allow known keys
  const allowedKeys = DEFAULTS.map(d => d.key)
  const booleanKeys = ['monetization_enabled']
  const superAdminOnlyKeys = ['monetization_enabled']

  for (const u of updates) {
    if (!allowedKeys.includes(u.key)) {
      return NextResponse.json({ error: `Unknown setting key: ${u.key}` }, { status: 400 })
    }
    if (superAdminOnlyKeys.includes(u.key) && !callerIsSuperAdmin) {
      return NextResponse.json({ error: 'Only the super admin can change monetization settings' }, { status: 403 })
    }
    if (booleanKeys.includes(u.key)) {
      if (!['true', 'false'].includes(u.value)) {
        return NextResponse.json({ error: `${u.key} must be "true" or "false"` }, { status: 400 })
      }
    } else {
      const num = Number(u.value)
      if (isNaN(num) || num < 0) {
        return NextResponse.json({ error: `${u.key} must be a non-negative number` }, { status: 400 })
      }
    }
  }

  for (const u of updates) {
    await db.appSetting.update({
      where: { key: u.key },
      data: { value: String(u.value), updatedByProfileId: session!.sub },
    })
  }

  const settings = await db.appSetting.findMany({ orderBy: { key: 'asc' } })
  return NextResponse.json({ ok: true, settings })
}
