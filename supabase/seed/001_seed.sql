-- ─────────────────────────────────────────────────────────────────────────────
-- SEED DATA
-- Run after migrations. Uses fixed UUIDs so re-runs are idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── COURTS ───────────────────────────────────────────────────────────────────
insert into courts (id, name, court_type, open_time, close_time, is_active)
values
  (
    '00000000-0000-0000-0001-000000000001',
    'Tennis Court',
    'tennis',
    '06:00',
    '18:00',
    true
  ),
  (
    '00000000-0000-0000-0001-000000000002',
    'Multipurpose Court',
    'multipurpose',
    '06:00',
    '20:00',
    true
  )
on conflict (id) do nothing;

-- ─── RESERVABLE UNITS ─────────────────────────────────────────────────────────
-- Tennis: one full-court unit
-- Multipurpose: basketball full-court blocks all pickleball
--               pickleball: three independent sub-courts (PB1, PB2, PB3)
insert into reservable_units (court_id, unit_key, sport_type, capacity, is_active)
values
  ('00000000-0000-0000-0001-000000000001', 'TENNIS_FULL',     'tennis',     1, true),
  ('00000000-0000-0000-0001-000000000002', 'BASKETBALL_FULL', 'basketball', 1, true),
  ('00000000-0000-0000-0001-000000000002', 'PB1',             'pickleball', 1, true),
  ('00000000-0000-0000-0001-000000000002', 'PB2',             'pickleball', 1, true),
  ('00000000-0000-0000-0001-000000000002', 'PB3',             'pickleball', 1, true)
on conflict (court_id, unit_key) do nothing;

-- ─── BOOKING SETTINGS ─────────────────────────────────────────────────────────
-- Tennis Court defaults
insert into booking_settings (
  court_id,
  slot_duration_minutes,
  booking_horizon_days,
  max_advance_bookings,
  weekly_hour_limit,
  monthly_hour_limit,
  cancellation_hours_notice,
  allow_recurring,
  allow_waitlist
)
values (
  '00000000-0000-0000-0001-000000000001',
  60,    -- 1-hour slots
  30,    -- can book up to 30 days ahead
  3,     -- max 3 upcoming confirmed bookings at once
  6,     -- max 6 hours per week
  null,  -- no monthly cap
  2,     -- must cancel at least 2 hours before
  true,
  true
)
on conflict (court_id) do nothing;

-- Multipurpose Court defaults
insert into booking_settings (
  court_id,
  slot_duration_minutes,
  booking_horizon_days,
  max_advance_bookings,
  weekly_hour_limit,
  monthly_hour_limit,
  cancellation_hours_notice,
  allow_recurring,
  allow_waitlist
)
values (
  '00000000-0000-0000-0001-000000000002',
  60,
  30,
  3,
  6,
  null,
  2,
  true,
  true
)
on conflict (court_id) do nothing;
