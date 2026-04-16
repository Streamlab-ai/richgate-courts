-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- All tables default-deny (enabled). Policies grant minimum required access.
-- Service-role key bypasses RLS — use only in server-side admin routes.
-- ─────────────────────────────────────────────────────────────────────────────

alter table profiles              enable row level security;
alter table registration_requests enable row level security;
alter table courts                enable row level security;
alter table reservable_units      enable row level security;
alter table weekly_sport_rules    enable row level security;
alter table booking_settings      enable row level security;
alter table blackout_dates        enable row level security;
alter table bookings              enable row level security;
alter table booking_session_items enable row level security;
alter table recurrence_series     enable row level security;
alter table waitlist_entries      enable row level security;
alter table checkin_events        enable row level security;
alter table notifications_log     enable row level security;
alter table csv_import_logs       enable row level security;
alter table audit_logs            enable row level security;

-- ─── PROFILES ─────────────────────────────────────────────────────────────────
-- Members see and edit their own row. Admins see all.
-- Members cannot escalate their own role.

create policy "profiles_select_own"
  on profiles for select
  using (auth.uid() = id);

create policy "profiles_select_admin"
  on profiles for select
  using (is_admin());

create policy "profiles_update_own"
  on profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    -- Prevent self-promotion: role must stay unchanged
    and role = (select p.role from profiles p where p.id = auth.uid())
  );

create policy "profiles_update_admin"
  on profiles for update
  using (is_admin());

-- ─── REGISTRATION REQUESTS ────────────────────────────────────────────────────
create policy "reg_requests_select_own"
  on registration_requests for select
  using (profile_id = auth.uid());

create policy "reg_requests_select_admin"
  on registration_requests for select
  using (is_admin());

create policy "reg_requests_update_admin"
  on registration_requests for update
  using (is_admin());

-- ─── COURTS ───────────────────────────────────────────────────────────────────
-- All authenticated users can read. Only admins can write.

create policy "courts_select_authenticated"
  on courts for select
  using (auth.uid() is not null);

create policy "courts_all_admin"
  on courts for all
  using (is_admin());

-- ─── RESERVABLE UNITS ─────────────────────────────────────────────────────────
create policy "reservable_units_select_authenticated"
  on reservable_units for select
  using (auth.uid() is not null);

create policy "reservable_units_all_admin"
  on reservable_units for all
  using (is_admin());

-- ─── WEEKLY SPORT RULES ───────────────────────────────────────────────────────
create policy "weekly_sport_rules_select_authenticated"
  on weekly_sport_rules for select
  using (auth.uid() is not null);

create policy "weekly_sport_rules_all_admin"
  on weekly_sport_rules for all
  using (is_admin());

-- ─── BOOKING SETTINGS ─────────────────────────────────────────────────────────
create policy "booking_settings_select_authenticated"
  on booking_settings for select
  using (auth.uid() is not null);

create policy "booking_settings_all_admin"
  on booking_settings for all
  using (is_admin());

-- ─── BLACKOUT DATES ───────────────────────────────────────────────────────────
create policy "blackout_dates_select_authenticated"
  on blackout_dates for select
  using (auth.uid() is not null);

create policy "blackout_dates_all_admin"
  on blackout_dates for all
  using (is_admin());

-- ─── BOOKINGS ─────────────────────────────────────────────────────────────────
-- Members see and create their own bookings.
-- Members can cancel their own confirmed bookings (update status field).
-- Admins have full access.

create policy "bookings_select_own"
  on bookings for select
  using (profile_id = auth.uid());

create policy "bookings_select_admin"
  on bookings for select
  using (is_admin());

create policy "bookings_insert_own"
  on bookings for insert
  with check (profile_id = auth.uid() and is_active_member());

create policy "bookings_update_own_confirmed"
  on bookings for update
  using (profile_id = auth.uid() and status = 'confirmed');

create policy "bookings_all_admin"
  on bookings for all
  using (is_admin());

-- ─── BOOKING SESSION ITEMS ────────────────────────────────────────────────────
create policy "session_items_select_own"
  on booking_session_items for select
  using (profile_id = auth.uid());

create policy "session_items_select_admin"
  on booking_session_items for select
  using (is_admin());

create policy "session_items_insert_own"
  on booking_session_items for insert
  with check (profile_id = auth.uid());

-- ─── RECURRENCE SERIES ────────────────────────────────────────────────────────
create policy "recurrence_series_select_own"
  on recurrence_series for select
  using (profile_id = auth.uid());

create policy "recurrence_series_select_admin"
  on recurrence_series for select
  using (is_admin());

create policy "recurrence_series_insert_own"
  on recurrence_series for insert
  with check (profile_id = auth.uid() and is_active_member());

create policy "recurrence_series_update_own"
  on recurrence_series for update
  using (profile_id = auth.uid());

create policy "recurrence_series_all_admin"
  on recurrence_series for all
  using (is_admin());

-- ─── WAITLIST ENTRIES ─────────────────────────────────────────────────────────
create policy "waitlist_select_own"
  on waitlist_entries for select
  using (profile_id = auth.uid());

create policy "waitlist_select_admin"
  on waitlist_entries for select
  using (is_admin());

create policy "waitlist_insert_own"
  on waitlist_entries for insert
  with check (profile_id = auth.uid() and is_active_member());

create policy "waitlist_update_own"
  on waitlist_entries for update
  using (profile_id = auth.uid());

create policy "waitlist_all_admin"
  on waitlist_entries for all
  using (is_admin());

-- ─── CHECKIN EVENTS ───────────────────────────────────────────────────────────
-- Members can read check-ins for their own bookings.
-- Only admins can insert check-in events (via service role in API routes).

create policy "checkin_events_select_own_bookings"
  on checkin_events for select
  using (
    exists (
      select 1 from bookings b
      where b.id = checkin_events.booking_id
        and b.profile_id = auth.uid()
    )
  );

create policy "checkin_events_all_admin"
  on checkin_events for all
  using (is_admin());

-- ─── NOTIFICATIONS LOG ────────────────────────────────────────────────────────
create policy "notifications_select_own"
  on notifications_log for select
  using (profile_id = auth.uid());

create policy "notifications_select_admin"
  on notifications_log for select
  using (is_admin());

-- ─── CSV IMPORT LOGS ──────────────────────────────────────────────────────────
create policy "csv_import_logs_all_admin"
  on csv_import_logs for all
  using (is_admin());

-- ─── AUDIT LOGS ───────────────────────────────────────────────────────────────
-- Append-only via security definer functions. Admins can read.

create policy "audit_logs_select_admin"
  on audit_logs for select
  using (is_admin());

create policy "audit_logs_insert_system"
  on audit_logs for insert
  with check (true);  -- actual gate is the security definer function that calls this
