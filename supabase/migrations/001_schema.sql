-- ─── EXTENSIONS ───────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── ENUMS ────────────────────────────────────────────────────────────────────
create type user_role           as enum ('member', 'admin');
create type user_status         as enum ('pending', 'active', 'suspended', 'deactivated');
create type registration_status as enum ('pending', 'approved', 'rejected');
create type court_type          as enum ('tennis', 'multipurpose');
create type sport_type          as enum ('tennis', 'basketball', 'pickleball');
create type unit_key            as enum ('TENNIS_FULL', 'BASKETBALL_FULL', 'PB1', 'PB2', 'PB3');
create type booking_status      as enum (
  'confirmed', 'cancelled_by_member', 'cancelled_by_admin', 'no_show', 'checked_in'
);
create type waitlist_status     as enum ('waiting', 'promoted', 'cancelled', 'expired');
create type recurrence_freq     as enum ('weekly', 'biweekly');
create type recurrence_status   as enum ('active', 'cancelled');
create type notification_type   as enum (
  'booking_confirmation', 'booking_cancellation',
  'waitlist_promotion', 'recurring_summary', 'checkin_reminder'
);
create type notification_status as enum ('sent', 'failed', 'skipped');

-- ─── MEMBER ID SEQUENCE ───────────────────────────────────────────────────────
create sequence if not exists member_id_seq start 1000 increment 1;

-- ─────────────────────────────────────────────────────────────────────────────
-- PROFILES
-- Mirrors auth.users. Created automatically on sign-up via trigger.
-- ─────────────────────────────────────────────────────────────────────────────
create table profiles (
  id          uuid        primary key references auth.users(id) on delete cascade,
  email       text        not null unique,
  full_name   text        not null,
  member_id   text        unique,                      -- assigned on approval; format RG-XXXXXX
  role        user_role   not null default 'member',
  status      user_status not null default 'pending',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- REGISTRATION REQUESTS
-- One request is created per sign-up. Admin approves or rejects.
-- ─────────────────────────────────────────────────────────────────────────────
create table registration_requests (
  id           uuid                not null primary key default uuid_generate_v4(),
  profile_id   uuid                not null references profiles(id) on delete cascade,
  email        text                not null,
  full_name    text                not null,
  status       registration_status not null default 'pending',
  reviewed_by  uuid                references profiles(id) on delete set null,
  reviewed_at  timestamptz,
  created_at   timestamptz         not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- COURTS
-- Two courts: TENNIS_MAIN and MULTIPURPOSE_MAIN
-- ─────────────────────────────────────────────────────────────────────────────
create table courts (
  id          uuid       not null primary key default uuid_generate_v4(),
  name        text       not null unique,
  court_type  court_type not null,
  open_time   time       not null default '06:00',
  close_time  time       not null default '18:00',
  is_active   boolean    not null default true,
  created_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- RESERVABLE UNITS
-- Tennis: TENNIS_FULL (capacity 1)
-- Multipurpose: BASKETBALL_FULL (capacity 1), PB1/PB2/PB3 (capacity 1 each)
-- ─────────────────────────────────────────────────────────────────────────────
create table reservable_units (
  id          uuid       not null primary key default uuid_generate_v4(),
  court_id    uuid       not null references courts(id) on delete cascade,
  unit_key    unit_key   not null,
  sport_type  sport_type not null,
  capacity    int        not null default 1 check (capacity >= 1),
  is_active   boolean    not null default true,
  unique (court_id, unit_key)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- WEEKLY SPORT RULES
-- Defines which sport owns which time window on which day of week.
-- Basketball blocks pickleball for the same multipurpose slot.
-- ─────────────────────────────────────────────────────────────────────────────
create table weekly_sport_rules (
  id           uuid       not null primary key default uuid_generate_v4(),
  court_id     uuid       not null references courts(id) on delete cascade,
  day_of_week  int        not null check (day_of_week between 0 and 6), -- 0=Sun, 6=Sat
  start_time   time       not null,
  end_time     time       not null,
  sport_type   sport_type not null,
  created_at   timestamptz not null default now(),
  check (end_time > start_time)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- BOOKING SETTINGS
-- One row per court. Controls all booking policy limits.
-- ─────────────────────────────────────────────────────────────────────────────
create table booking_settings (
  id                          uuid    not null primary key default uuid_generate_v4(),
  court_id                    uuid    not null unique references courts(id) on delete cascade,
  slot_duration_minutes       int     not null default 60  check (slot_duration_minutes > 0),
  booking_horizon_days        int     not null default 30  check (booking_horizon_days > 0),
  max_advance_bookings        int     not null default 3   check (max_advance_bookings > 0),
  weekly_hour_limit           numeric(5,2),                -- null = no limit
  monthly_hour_limit          numeric(5,2),                -- null = no limit
  cancellation_hours_notice   int     not null default 2   check (cancellation_hours_notice >= 0),
  allow_recurring             boolean not null default true,
  allow_waitlist              boolean not null default true,
  updated_at                  timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- BLACKOUT DATES
-- court_id null = applies to all courts.
-- ─────────────────────────────────────────────────────────────────────────────
create table blackout_dates (
  id              uuid        not null primary key default uuid_generate_v4(),
  court_id        uuid        references courts(id) on delete cascade,  -- null = all courts
  start_datetime  timestamptz not null,
  end_datetime    timestamptz not null,
  reason          text,
  created_by      uuid        not null references profiles(id),
  created_at      timestamptz not null default now(),
  check (end_datetime > start_datetime)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- RECURRENCE SERIES
-- Created before bookings. Each booking in the series references this row.
-- ─────────────────────────────────────────────────────────────────────────────
create table recurrence_series (
  id                   uuid             not null primary key default uuid_generate_v4(),
  profile_id           uuid             not null references profiles(id) on delete cascade,
  court_id             uuid             not null references courts(id),
  sport_type           sport_type       not null,
  start_date           date             not null,
  end_date             date             not null,
  frequency            recurrence_freq  not null,
  day_of_week          int              not null check (day_of_week between 0 and 6),
  start_time           time             not null,
  end_time             time             not null,
  status               recurrence_status not null default 'active',
  total_occurrences    int              not null default 0,
  created_occurrences  int              not null default 0,
  failed_occurrences   int              not null default 0,
  created_at           timestamptz      not null default now(),
  check (end_date >= start_date),
  check (end_time > start_time)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- BOOKINGS
-- Core reservation record. qr_token is assigned on creation; unique constraint
-- prevents duplicate check-ins via the token.
-- ─────────────────────────────────────────────────────────────────────────────
create table bookings (
  id                   uuid           not null primary key default uuid_generate_v4(),
  profile_id           uuid           not null references profiles(id) on delete cascade,
  court_id             uuid           not null references courts(id),
  reservable_unit_id   uuid           not null references reservable_units(id),
  sport_type           sport_type     not null,
  date                 date           not null,
  start_time           time           not null,
  end_time             time           not null,
  status               booking_status not null default 'confirmed',
  is_recurring         boolean        not null default false,
  recurrence_series_id uuid           references recurrence_series(id) on delete set null,
  qr_token             text           unique,
  is_admin_override    boolean        not null default false,
  cancelled_at         timestamptz,
  cancelled_by         uuid           references profiles(id) on delete set null,
  created_at           timestamptz    not null default now(),
  updated_at           timestamptz    not null default now(),
  check (end_time > start_time)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- BOOKING SESSION ITEMS
-- Groups multiple bookings created in one session (multi-slot booking).
-- session_id is a client-generated UUID per booking flow attempt.
-- ─────────────────────────────────────────────────────────────────────────────
create table booking_session_items (
  id          uuid        not null primary key default uuid_generate_v4(),
  session_id  uuid        not null,
  booking_id  uuid        not null references bookings(id) on delete cascade,
  profile_id  uuid        not null references profiles(id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- WAITLIST ENTRIES
-- reservable_unit_id is null when the member is waiting for any available unit
-- for that sport_type (e.g. any of PB1/PB2/PB3).
-- ─────────────────────────────────────────────────────────────────────────────
create table waitlist_entries (
  id                   uuid            not null primary key default uuid_generate_v4(),
  profile_id           uuid            not null references profiles(id) on delete cascade,
  court_id             uuid            not null references courts(id),
  reservable_unit_id   uuid            references reservable_units(id) on delete set null,
  sport_type           sport_type      not null,
  date                 date            not null,
  start_time           time            not null,
  end_time             time            not null,
  status               waitlist_status not null default 'waiting',
  promoted_booking_id  uuid            references bookings(id) on delete set null,
  created_at           timestamptz     not null default now(),
  updated_at           timestamptz     not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- CHECKIN EVENTS
-- One row per check-in. Duplicate check-ins blocked at application layer
-- (and via unique index on booking_id when is_admin_override=false).
-- ─────────────────────────────────────────────────────────────────────────────
create table checkin_events (
  id                uuid        not null primary key default uuid_generate_v4(),
  booking_id        uuid        not null references bookings(id) on delete cascade,
  checked_in_by     uuid        not null references profiles(id),
  checked_in_at     timestamptz not null default now(),
  is_admin_override boolean     not null default false,
  note              text
);

-- Prevent duplicate non-override check-ins at DB level
create unique index checkin_events_booking_no_override_idx
  on checkin_events (booking_id)
  where (is_admin_override = false);

-- ─────────────────────────────────────────────────────────────────────────────
-- NOTIFICATIONS LOG
-- Every outbound notification attempt is logged here.
-- ─────────────────────────────────────────────────────────────────────────────
create table notifications_log (
  id             uuid                not null primary key default uuid_generate_v4(),
  profile_id     uuid                not null references profiles(id) on delete cascade,
  booking_id     uuid                references bookings(id) on delete set null,
  type           notification_type   not null,
  status         notification_status not null,
  channel        text                not null default 'email',
  error_message  text,
  sent_at        timestamptz         not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- CSV IMPORT LOGS
-- Tracks every admin CSV member import attempt.
-- ─────────────────────────────────────────────────────────────────────────────
create table csv_import_logs (
  id             uuid        not null primary key default uuid_generate_v4(),
  imported_by    uuid        not null references profiles(id),
  filename       text        not null,
  total_rows     int         not null default 0,
  created_count  int         not null default 0,
  skipped_count  int         not null default 0,
  error_count    int         not null default 0,
  errors_json    jsonb,
  created_at     timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- AUDIT LOGS
-- Append-only log of all admin and system actions.
-- ─────────────────────────────────────────────────────────────────────────────
create table audit_logs (
  id            uuid        not null primary key default uuid_generate_v4(),
  actor_id      uuid        references profiles(id) on delete set null,
  action        text        not null,
  target_table  text,
  target_id     uuid,
  old_data      jsonb,
  new_data      jsonb,
  created_at    timestamptz not null default now()
);

-- ─── INDEXES ──────────────────────────────────────────────────────────────────
-- bookings
create index idx_bookings_profile_id          on bookings (profile_id);
create index idx_bookings_court_id            on bookings (court_id);
create index idx_bookings_unit_date           on bookings (reservable_unit_id, date, start_time);
create index idx_bookings_date_status         on bookings (date, status);
create index idx_bookings_recurrence_series   on bookings (recurrence_series_id);

-- waitlist
create index idx_waitlist_profile             on waitlist_entries (profile_id);
create index idx_waitlist_slot                on waitlist_entries (court_id, date, start_time, status);

-- registration_requests
create index idx_reg_requests_profile        on registration_requests (profile_id);
create index idx_reg_requests_status         on registration_requests (status);

-- notifications_log
create index idx_notifications_profile       on notifications_log (profile_id);
create index idx_notifications_booking       on notifications_log (booking_id);

-- checkin_events
create index idx_checkin_booking             on checkin_events (booking_id);

-- audit_logs
create index idx_audit_actor                 on audit_logs (actor_id);
create index idx_audit_target                on audit_logs (target_table, target_id);

-- booking_session_items
create index idx_session_items_session       on booking_session_items (session_id);
create index idx_session_items_profile       on booking_session_items (profile_id);
