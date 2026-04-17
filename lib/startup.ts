// Runs once on server cold start via instrumentation.ts
// Applies any missing schema columns, seeds app settings defaults,
// and ensures demo accounts exist.
// All statements are idempotent — safe to run on every deploy.
// Steps run in parallel where possible to minimize cold-start latency.

import { db } from './db'
import { hash } from '@node-rs/bcrypt'

async function step(name: string, fn: () => Promise<unknown>) {
  try {
    await fn()
  } catch (err) {
    console.error(`[startup] ⚠️  Step "${name}" failed:`, err)
  }
}

export async function runStartup() {
  const t0 = Date.now()

  // ── Phase 1: Schema migrations (all independent, run in parallel) ───────────
  await Promise.all([
    step('add guest/payment columns to bookings', () => db.$executeRaw`
      ALTER TABLE bookings
        ADD COLUMN IF NOT EXISTS is_guest         BOOLEAN   NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS guest_name       TEXT,
        ADD COLUMN IF NOT EXISTS guest_email      TEXT,
        ADD COLUMN IF NOT EXISTS guest_phone      TEXT,
        ADD COLUMN IF NOT EXISTS payment_status   TEXT,
        ADD COLUMN IF NOT EXISTS payment_ref      TEXT,
        ADD COLUMN IF NOT EXISTS amount_paid      INTEGER,
        ADD COLUMN IF NOT EXISTS payment_expires_at TIMESTAMPTZ
    `),
    step('make member_id nullable', () => db.$executeRaw`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'bookings' AND column_name = 'member_id' AND is_nullable = 'NO'
        ) THEN ALTER TABLE bookings ALTER COLUMN member_id DROP NOT NULL; END IF;
      END $$
    `),
    step('create app_settings table', () => db.$executeRaw`
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY, label TEXT NOT NULL DEFAULT '', value TEXT NOT NULL DEFAULT '',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_by_profile_id TEXT
      )
    `),
    step('add member_type to profiles', () => db.$executeRaw`
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS member_type TEXT NOT NULL DEFAULT 'hoa'
    `),
    step('add booker_type to bookings', () => db.$executeRaw`
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booker_type TEXT
    `),
    step('add booker_type to weekly_sport_rules', () => db.$executeRaw`
      ALTER TABLE weekly_sport_rules ADD COLUMN IF NOT EXISTS booker_type TEXT
    `),
  ])

  // ── Phase 2: Seeds + data fixes (depend on Phase 1 tables, run in parallel) ─
  await Promise.all([
    step('seed app_settings defaults', () => db.$executeRaw`
      INSERT INTO app_settings (key, label, value) VALUES
        ('monetization_enabled',      'Monetization (charge non-members)',  'false'),
        ('price_per_hour_tennis',     'Tennis — Price per Hour (₱)',        '200'),
        ('price_per_hour_pickleball', 'Pickleball — Price per Hour (₱)',    '200'),
        ('price_per_hour_basketball', 'Basketball — Price per Hour (₱)',    '400'),
        ('price_per_day_bptl_tennis', 'BPTL Tennis — Daily Access Rate (₱)', '100')
      ON CONFLICT (key) DO NOTHING
    `),
    step('fix super admin memberId', () => db.$executeRaw`
      UPDATE profiles SET member_id = 'RG-000001'
      WHERE email IN ('admin@richgate.local', 'superadmin@richgate.local')
        AND (member_id IS NULL OR member_id != 'RG-000001')
    `),
    step('fix orphaned BPTL rule court IDs', () => db.$executeRaw`
      UPDATE weekly_sport_rules
      SET    court_id = (SELECT id FROM courts WHERE court_type = 'tennis' AND is_active = true LIMIT 1),
             updated_at = NOW()
      WHERE  sport_type = 'tennis' AND booker_type = 'bptl'
        AND  court_id NOT IN (SELECT id FROM courts WHERE court_type = 'tennis' AND is_active = true)
    `),
    step('migrate legacy roles', () => db.$executeRaw`
      DO $$ BEGIN
        UPDATE profiles SET role = 'bptl'  WHERE role = 'member' AND member_type = 'bptl';
        UPDATE profiles SET role = 'hoa'   WHERE role = 'member' AND (member_type = 'hoa' OR member_type IS NULL);
        UPDATE profiles SET role = 'super_admin' WHERE member_id = 'RG-000001' AND role = 'admin';
      END $$
    `),
    step('rename super admin email', () => db.$executeRaw`
      UPDATE profiles SET email = 'superadmin@richgate.local'
      WHERE email = 'admin@richgate.local' AND member_id = 'RG-000001'
    `),
    step('fix BPTL Mon-Fri end time', () => db.$executeRaw`
      UPDATE weekly_sport_rules SET end_time = '12:00', updated_at = NOW()
      WHERE sport_type = 'tennis' AND booker_type = 'bptl'
        AND day_of_week IN (1,2,3,4,5) AND end_time = '14:00'
    `),
  ])

  // ── Phase 3: BPTL rules seed (depends on Phase 2 orphan fix) ────────────────
  await step('seed BPTL tennis rules', () => db.$executeRaw`
    INSERT INTO weekly_sport_rules
      (id, court_id, day_of_week, sport_type, start_time, end_time, is_active, booker_type, created_at, updated_at)
    SELECT gen_random_uuid(), tc.id, g.dow, 'tennis', g.t_start, g.t_end, true, 'bptl', NOW(), NOW()
    FROM (SELECT id FROM courts WHERE court_type = 'tennis' AND is_active = true LIMIT 1) tc
    CROSS JOIN (VALUES
      (1,'06:00','12:00'),(2,'06:00','12:00'),(3,'06:00','12:00'),
      (4,'06:00','12:00'),(5,'06:00','12:00'),(0,'06:00','18:00'),(6,'06:00','18:00')
    ) AS g(dow, t_start, t_end)
    WHERE NOT EXISTS (
      SELECT 1 FROM weekly_sport_rules r
      WHERE r.court_id = tc.id AND r.sport_type = 'tennis'
        AND r.booker_type = 'bptl' AND r.day_of_week = g.dow
    )
  `)

  // ── Phase 4: Demo accounts (all independent, run in parallel) ───────────────
  // Only hash passwords when accounts don't exist yet — avoids ~100ms hash on every cold start
  await Promise.all([
    step('ensure super admin password', async () => {
      const sa = await db.profile.findUnique({ where: { email: 'superadmin@richgate.local' }, select: { role: true } })
      if (sa && sa.role !== 'super_admin') {
        await db.profile.update({ where: { email: 'superadmin@richgate.local' }, data: { role: 'super_admin' } })
      }
    }),
    step('ensure admin-demo account', async () => {
      const exists = await db.profile.findUnique({ where: { email: 'admin-demo@richgate.local' }, select: { id: true } })
      if (!exists) {
        const pw = await hash('admin1234', 12)
        const last = await db.profile.findFirst({ where: { memberId: { not: null } }, orderBy: { memberId: 'desc' } })
        const nextNum = last?.memberId ? parseInt(last.memberId.replace('RG-', '')) + 1 : 2
        await db.profile.create({
          data: { email: 'admin-demo@richgate.local', passwordHash: pw, fullName: 'Admin Demo', role: 'admin', status: 'active', memberId: `RG-${String(nextNum).padStart(6, '0')}` },
        })
      }
    }),
    step('ensure guard demo', async () => {
      const exists = await db.profile.findUnique({ where: { email: 'guard@richgate.local' }, select: { role: true } })
      if (!exists) {
        const pw = await hash('guard1234', 12)
        await db.profile.create({ data: { email: 'guard@richgate.local', passwordHash: pw, fullName: 'Security Guard', role: 'guard', status: 'active' } })
      } else if (exists.role !== 'guard') {
        await db.profile.update({ where: { email: 'guard@richgate.local' }, data: { role: 'guard' } })
      }
    }),
    step('ensure bptl demo', async () => {
      const exists = await db.profile.findUnique({ where: { email: 'bptl-demo@richgate.local' }, select: { role: true } })
      if (!exists) {
        const pw = await hash('bptl1234', 12)
        const last = await db.profile.findFirst({ where: { memberId: { not: null } }, orderBy: { memberId: 'desc' } })
        const nextNum = last?.memberId ? parseInt(last.memberId.replace('RG-', '')) + 1 : 2
        await db.profile.create({
          data: { email: 'bptl-demo@richgate.local', passwordHash: pw, fullName: 'BPTL Demo Member', role: 'bptl', status: 'active', memberId: `RG-${String(nextNum).padStart(6, '0')}` },
        })
      } else if (exists.role !== 'bptl') {
        await db.profile.update({ where: { email: 'bptl-demo@richgate.local' }, data: { role: 'bptl' } })
      }
    }),
    step('ensure hoa demo', async () => {
      const exists = await db.profile.findUnique({ where: { email: 'hoa-demo@richgate.local' }, select: { role: true } })
      if (!exists) {
        const pw = await hash('demo1234', 12)
        const last = await db.profile.findFirst({ where: { memberId: { not: null } }, orderBy: { memberId: 'desc' } })
        const nextNum = last?.memberId ? parseInt(last.memberId.replace('RG-', '')) + 1 : 2
        await db.profile.create({
          data: { email: 'hoa-demo@richgate.local', passwordHash: pw, fullName: 'HOA Demo Member', role: 'hoa', status: 'active', memberId: `RG-${String(nextNum).padStart(6, '0')}` },
        })
      } else if (exists.role !== 'hoa' && exists.role !== 'admin' && exists.role !== 'super_admin') {
        await db.profile.update({ where: { email: 'hoa-demo@richgate.local' }, data: { role: 'hoa' } })
      }
    }),
  ])

  console.log(`[startup] ✅ Complete in ${Date.now() - t0}ms`)
}
