// Runs once on server cold start via instrumentation.ts
// Applies any missing schema columns, seeds app settings defaults,
// and ensures the super admin account has the correct memberId.
// All statements are idempotent — safe to run on every deploy.
// Each step has its own try-catch so failures are isolated.

import { db } from './db'

async function step(name: string, fn: () => Promise<unknown>) {
  try {
    await fn()
  } catch (err) {
    console.error(`[startup] ⚠️  Step "${name}" failed:`, err)
  }
}

export async function runStartup() {
  // ── 1. Add guest + payment columns to bookings ──────────────────────────────
  await step('add guest/payment columns to bookings', () => db.$executeRaw`
    ALTER TABLE bookings
      ADD COLUMN IF NOT EXISTS is_guest         BOOLEAN   NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS guest_name       TEXT,
      ADD COLUMN IF NOT EXISTS guest_email      TEXT,
      ADD COLUMN IF NOT EXISTS guest_phone      TEXT,
      ADD COLUMN IF NOT EXISTS payment_status   TEXT,
      ADD COLUMN IF NOT EXISTS payment_ref      TEXT,
      ADD COLUMN IF NOT EXISTS amount_paid      INTEGER,
      ADD COLUMN IF NOT EXISTS payment_expires_at TIMESTAMPTZ
  `)

  // ── 2. Make member_id nullable ───────────────────────────────────────────────
  await step('make member_id nullable', () => db.$executeRaw`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'bookings'
          AND column_name = 'member_id'
          AND is_nullable = 'NO'
      ) THEN
        ALTER TABLE bookings ALTER COLUMN member_id DROP NOT NULL;
      END IF;
    END $$
  `)

  // ── 3. Create app_settings table ────────────────────────────────────────────
  await step('create app_settings table', () => db.$executeRaw`
    CREATE TABLE IF NOT EXISTS app_settings (
      key                    TEXT PRIMARY KEY,
      label                  TEXT NOT NULL DEFAULT '',
      value                  TEXT NOT NULL DEFAULT '',
      updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_by_profile_id  TEXT
    )
  `)

  // ── 4. Seed app_settings defaults ───────────────────────────────────────────
  await step('seed app_settings defaults', () => db.$executeRaw`
    INSERT INTO app_settings (key, label, value) VALUES
      ('monetization_enabled',      'Monetization (charge non-members)',  'false'),
      ('price_per_hour_tennis',     'Tennis — Price per Hour (₱)',        '200'),
      ('price_per_hour_pickleball', 'Pickleball — Price per Hour (₱)',    '200'),
      ('price_per_hour_basketball', 'Basketball — Price per Hour (₱)',    '400')
    ON CONFLICT (key) DO NOTHING
  `)

  // ── 5. Fix super admin memberId ──────────────────────────────────────────────
  await step('fix super admin memberId', () => db.$executeRaw`
    UPDATE profiles
    SET    member_id = 'RG-000001'
    WHERE  email = 'admin@richgate.local'
      AND  (member_id IS NULL OR member_id != 'RG-000001')
  `)

  // ── 6. Add member_type to profiles (legacy — kept for existing data) ─────────
  await step('add member_type to profiles', () => db.$executeRaw`
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS member_type TEXT NOT NULL DEFAULT 'hoa'
  `)

  // ── 7. Add booker_type to bookings ────────────────────────────────────────────
  await step('add booker_type to bookings', () => db.$executeRaw`
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booker_type TEXT
  `)

  // ── 8. Add booker_type to weekly_sport_rules ──────────────────────────────────
  await step('add booker_type to weekly_sport_rules', () => db.$executeRaw`
    ALTER TABLE weekly_sport_rules ADD COLUMN IF NOT EXISTS booker_type TEXT
  `)

  // ── 9. Seed BPTL app setting default ─────────────────────────────────────────
  await step('seed BPTL app setting', () => db.$executeRaw`
    INSERT INTO app_settings (key, label, value) VALUES
      ('price_per_day_bptl_tennis', 'BPTL Tennis — Daily Access Rate (₱)', '100')
    ON CONFLICT (key) DO NOTHING
  `)

  // ── 10. Seed BPTL exclusive tennis rules ─────────────────────────────────────
  await step('seed BPTL tennis rules', () => db.$executeRaw`
    INSERT INTO weekly_sport_rules
      (id, court_id, day_of_week, sport_type, start_time, end_time, is_active, booker_type, created_at, updated_at)
    SELECT
      gen_random_uuid(),
      '00000000-0000-0000-0001-000000000001',
      g.dow,
      'tennis',
      g.t_start,
      g.t_end,
      true,
      'bptl',
      NOW(),
      NOW()
    FROM (VALUES
      (1,'06:00','14:00'),
      (2,'06:00','14:00'),
      (3,'06:00','14:00'),
      (4,'06:00','14:00'),
      (5,'06:00','14:00'),
      (0,'06:00','18:00'),
      (6,'06:00','18:00')
    ) AS g(dow, t_start, t_end)
    WHERE NOT EXISTS (
      SELECT 1 FROM weekly_sport_rules r
      WHERE r.court_id   = '00000000-0000-0000-0001-000000000001'
        AND r.sport_type = 'tennis'
        AND r.booker_type = 'bptl'
        AND r.day_of_week = g.dow
    )
  `)

  // ── 11. Migrate legacy role values ───────────────────────────────────────────
  await step('migrate role: member→bptl', () => db.$executeRaw`
    UPDATE profiles SET role = 'bptl'
    WHERE role = 'member' AND member_type = 'bptl'
  `)

  await step('migrate role: member→hoa', () => db.$executeRaw`
    UPDATE profiles SET role = 'hoa'
    WHERE role = 'member' AND (member_type = 'hoa' OR member_type IS NULL)
  `)

  await step('migrate role: admin→super_admin', () => db.$executeRaw`
    UPDATE profiles SET role = 'super_admin'
    WHERE member_id = 'RG-000001' AND role = 'admin'
  `)

  console.log('[startup] ✅ Schema + seed checks complete')
}
