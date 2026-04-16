-- ─────────────────────────────────────────────────────────────────────────────
-- UPDATED_AT TRIGGER
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

create trigger bookings_updated_at
  before update on bookings
  for each row execute function set_updated_at();

create trigger waitlist_updated_at
  before update on waitlist_entries
  for each row execute function set_updated_at();

create trigger booking_settings_updated_at
  before update on booking_settings
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- NEW AUTH USER → PROFILE + REGISTRATION REQUEST
-- Fires after every Supabase Auth sign-up. Creates a pending profile and a
-- matching registration_request for admin review.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_full_name text;
begin
  v_full_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (id, email, full_name, role, status)
  values (new.id, new.email, v_full_name, 'member', 'pending');

  insert into public.registration_requests (profile_id, email, full_name, status)
  values (new.id, new.email, v_full_name, 'pending');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();

-- ─────────────────────────────────────────────────────────────────────────────
-- MEMBER ID GENERATION
-- Generates the next collision-free member ID in the format RG-XXXXXX.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function generate_member_id()
returns text
language plpgsql
as $$
declare
  v_next bigint;
  v_id   text;
begin
  loop
    v_next := nextval('member_id_seq');
    v_id   := 'RG-' || lpad(v_next::text, 6, '0');
    exit when not exists (select 1 from public.profiles where member_id = v_id);
  end loop;
  return v_id;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- APPROVE REGISTRATION
-- Sets profile to active, assigns member_id if missing, updates request.
-- Must be called from a server-side admin API route (service role).
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function approve_registration(
  p_request_id uuid,
  p_admin_id   uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_new_mid    text;
begin
  select profile_id into v_profile_id
  from registration_requests
  where id = p_request_id and status = 'pending';

  if v_profile_id is null then
    raise exception 'registration_request % not found or already processed', p_request_id;
  end if;

  -- Assign member_id if not yet set
  select member_id into v_new_mid from profiles where id = v_profile_id;
  if v_new_mid is null then
    v_new_mid := generate_member_id();
  end if;

  update profiles
  set status     = 'active',
      member_id  = v_new_mid,
      updated_at = now()
  where id = v_profile_id;

  update registration_requests
  set status      = 'approved',
      reviewed_by = p_admin_id,
      reviewed_at = now()
  where id = p_request_id;

  insert into audit_logs (actor_id, action, target_table, target_id, new_data)
  values (
    p_admin_id, 'approve_registration', 'registration_requests', p_request_id,
    jsonb_build_object('profile_id', v_profile_id, 'member_id', v_new_mid)
  );
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- REJECT REGISTRATION
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function reject_registration(
  p_request_id uuid,
  p_admin_id   uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
begin
  select profile_id into v_profile_id
  from registration_requests
  where id = p_request_id and status = 'pending';

  if v_profile_id is null then
    raise exception 'registration_request % not found or already processed', p_request_id;
  end if;

  update registration_requests
  set status      = 'rejected',
      reviewed_by = p_admin_id,
      reviewed_at = now()
  where id = p_request_id;

  -- Leave profile as-is (status stays 'pending'); admin can deactivate separately.

  insert into audit_logs (actor_id, action, target_table, target_id)
  values (p_admin_id, 'reject_registration', 'registration_requests', p_request_id);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- HELPER PREDICATES (callable in RLS policies)
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function is_active_member()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and status = 'active'
  );
$$;
