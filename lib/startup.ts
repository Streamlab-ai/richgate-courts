// Runs once on server cold start via instrumentation.ts
// Applies any missing schema columns, seeds app settings defaults,
// and ensures the super admin account has the correct memberId.
// All statements are idempotent — safe to run on every deploy.

import { db } from './db'

export async function runStartup() {
  try {
    // ── 1. Add guest + payment columns to bookings (IF NOT EXISTS) ──────────
    await db.$executeRaw`
      ALTER TABLE bookings
        ADD COLUMN IF NOT EXISTS is_guest         BOOLEAN   NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS guest_name       TEXT,
        ADD COLUMN IF NOT EXISTS guest_email      TEXT,
        ADD COLUMN IF NOT EXISTS guest_phone      TEXT,
        ADD COLUMN IF NOT EXISTS payment_status   TEXT,
        ADD COLUMN IF NOT EXISTS payment_ref      TEXT,
        ADD COLUMN IF NOT EXISTS amount_paid      INTEGER,
        ADD COLUMN IF NOT EXISTS payment_expires_at TIMESTAMPTZ
    `

    // ── 2. Make member_id nullable (DROP NOT NULL is idempotent in Postgres) ─
    await db.$executeRaw`
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
    `

    // ── 3. Create app_settings table (IF NOT EXISTS) ─────────────────────────
    await db.$executeRaw`
      CREATE TABLE IF NOT EXISTS app_settings (
        key                    TEXT PRIMARY KEY,
        label                  TEXT NOT NULL DEFAULT '',
        value                  TEXT NOT NULL DEFAULT '',
        updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by_profile_id  TEXT
      )
    `

    // ── 4. Seed app_settings defaults (INSERT ... ON CONFLICT DO NOTHING) ────
    await db.$executeRaw`
      INSERT INTO app_settings (key, label, value) VALUES
        ('monetization_enabled',      'Monetization (charge non-members)',  'false'),
        ('price_per_hour_tennis',     'Tennis — Price per Hour (₱)',        '200'),
        ('price_per_hour_pickleball', 'Pickleball — Price per Hour (₱)',    '200'),
        ('price_per_hour_basketball', 'Basketball — Price per Hour (₱)',    '400')
      ON CONFLICT (key) DO NOTHING
    `

    // ── 5. Fix super admin memberId ──────────────────────────────────────────
    await db.$executeRaw`
      UPDATE profiles
      SET    member_id = 'RG-000001'
      WHERE  email = 'admin@richgate.local'
        AND  (member_id IS NULL OR member_id != 'RG-000001')
    `

    console.log('[startup] ✅ Schema + seed checks complete')
  } catch (err) {
    // Non-fatal — log and continue. App still works; fixes will retry next cold start.
    console.error('[startup] ⚠️  Error during startup migration:', err)
  }
}
