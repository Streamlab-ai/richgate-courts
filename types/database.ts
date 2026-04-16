/**
 * Database type definitions matching the Supabase schema.
 *
 * Pass this type to createClient<Database>() for full type inference:
 *   createBrowserClient<Database>(url, key)
 *   createServerClient<Database>(url, key, { cookies })
 *
 * Row    = what you get back from a SELECT
 * Insert = what you pass to INSERT (omits generated/defaulted fields)
 * Update = partial Insert for UPDATE calls
 */

// ─── DB ENUM LITERALS ────────────────────────────────────────────────────────
export type DbUserRole          = 'member' | 'admin'
export type DbUserStatus        = 'pending' | 'active' | 'suspended' | 'deactivated'
export type DbRegistrationStatus = 'pending' | 'approved' | 'rejected'
export type DbCourtType         = 'tennis' | 'multipurpose'
export type DbSportType         = 'tennis' | 'basketball' | 'pickleball'
export type DbUnitKey           = 'TENNIS_FULL' | 'BASKETBALL_FULL' | 'PB1' | 'PB2' | 'PB3'
export type DbBookingStatus     = 'confirmed' | 'cancelled_by_member' | 'cancelled_by_admin' | 'no_show' | 'checked_in'
export type DbWaitlistStatus    = 'waiting' | 'promoted' | 'cancelled' | 'expired'
export type DbRecurrenceFreq    = 'weekly' | 'biweekly'
export type DbRecurrenceStatus  = 'active' | 'cancelled'
export type DbNotificationType  = 'booking_confirmation' | 'booking_cancellation' | 'waitlist_promotion' | 'recurring_summary' | 'checkin_reminder'
export type DbNotificationStatus = 'sent' | 'failed' | 'skipped'

// ─────────────────────────────────────────────────────────────────────────────
// DATABASE TYPE
// ─────────────────────────────────────────────────────────────────────────────
export interface Database {
  public: {
    Tables: {

      // ── profiles ────────────────────────────────────────────────────────────
      profiles: {
        Row: {
          id:         string
          email:      string
          full_name:  string
          member_id:  string | null
          role:       DbUserRole
          status:     DbUserStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id:         string
          email:      string
          full_name:  string
          member_id?: string | null
          role?:      DbUserRole
          status?:    DbUserStatus
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }

      // ── registration_requests ───────────────────────────────────────────────
      registration_requests: {
        Row: {
          id:          string
          profile_id:  string
          email:       string
          full_name:   string
          status:      DbRegistrationStatus
          reviewed_by: string | null
          reviewed_at: string | null
          created_at:  string
        }
        Insert: {
          id?:         string
          profile_id:  string
          email:       string
          full_name:   string
          status?:     DbRegistrationStatus
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?:  string
        }
        Update: Partial<Database['public']['Tables']['registration_requests']['Insert']>
      }

      // ── courts ──────────────────────────────────────────────────────────────
      courts: {
        Row: {
          id:         string
          name:       string
          court_type: DbCourtType
          open_time:  string   // HH:MM:SS
          close_time: string
          is_active:  boolean
          created_at: string
        }
        Insert: {
          id?:         string
          name:        string
          court_type:  DbCourtType
          open_time?:  string
          close_time?: string
          is_active?:  boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['courts']['Insert']>
      }

      // ── reservable_units ────────────────────────────────────────────────────
      reservable_units: {
        Row: {
          id:         string
          court_id:   string
          unit_key:   DbUnitKey
          sport_type: DbSportType
          capacity:   number
          is_active:  boolean
        }
        Insert: {
          id?:        string
          court_id:   string
          unit_key:   DbUnitKey
          sport_type: DbSportType
          capacity?:  number
          is_active?: boolean
        }
        Update: Partial<Database['public']['Tables']['reservable_units']['Insert']>
      }

      // ── weekly_sport_rules ──────────────────────────────────────────────────
      weekly_sport_rules: {
        Row: {
          id:          string
          court_id:    string
          day_of_week: number
          start_time:  string
          end_time:    string
          sport_type:  DbSportType
          created_at:  string
        }
        Insert: {
          id?:          string
          court_id:     string
          day_of_week:  number
          start_time:   string
          end_time:     string
          sport_type:   DbSportType
          created_at?:  string
        }
        Update: Partial<Database['public']['Tables']['weekly_sport_rules']['Insert']>
      }

      // ── booking_settings ────────────────────────────────────────────────────
      booking_settings: {
        Row: {
          id:                         string
          court_id:                   string
          slot_duration_minutes:      number
          booking_horizon_days:       number
          max_advance_bookings:       number
          weekly_hour_limit:          number | null
          monthly_hour_limit:         number | null
          cancellation_hours_notice:  number
          allow_recurring:            boolean
          allow_waitlist:             boolean
          updated_at:                 string
        }
        Insert: {
          id?:                         string
          court_id:                    string
          slot_duration_minutes?:      number
          booking_horizon_days?:       number
          max_advance_bookings?:       number
          weekly_hour_limit?:          number | null
          monthly_hour_limit?:         number | null
          cancellation_hours_notice?:  number
          allow_recurring?:            boolean
          allow_waitlist?:             boolean
          updated_at?:                 string
        }
        Update: Partial<Database['public']['Tables']['booking_settings']['Insert']>
      }

      // ── blackout_dates ──────────────────────────────────────────────────────
      blackout_dates: {
        Row: {
          id:              string
          court_id:        string | null
          start_datetime:  string
          end_datetime:    string
          reason:          string | null
          created_by:      string
          created_at:      string
        }
        Insert: {
          id?:              string
          court_id?:        string | null
          start_datetime:   string
          end_datetime:     string
          reason?:          string | null
          created_by:       string
          created_at?:      string
        }
        Update: Partial<Database['public']['Tables']['blackout_dates']['Insert']>
      }

      // ── recurrence_series ───────────────────────────────────────────────────
      recurrence_series: {
        Row: {
          id:                   string
          profile_id:           string
          court_id:             string
          sport_type:           DbSportType
          start_date:           string   // YYYY-MM-DD
          end_date:             string
          frequency:            DbRecurrenceFreq
          day_of_week:          number
          start_time:           string
          end_time:             string
          status:               DbRecurrenceStatus
          total_occurrences:    number
          created_occurrences:  number
          failed_occurrences:   number
          created_at:           string
        }
        Insert: {
          id?:                   string
          profile_id:            string
          court_id:              string
          sport_type:            DbSportType
          start_date:            string
          end_date:              string
          frequency:             DbRecurrenceFreq
          day_of_week:           number
          start_time:            string
          end_time:              string
          status?:               DbRecurrenceStatus
          total_occurrences?:    number
          created_occurrences?:  number
          failed_occurrences?:   number
          created_at?:           string
        }
        Update: Partial<Database['public']['Tables']['recurrence_series']['Insert']>
      }

      // ── bookings ────────────────────────────────────────────────────────────
      bookings: {
        Row: {
          id:                   string
          profile_id:           string
          court_id:             string
          reservable_unit_id:   string
          sport_type:           DbSportType
          date:                 string   // YYYY-MM-DD
          start_time:           string
          end_time:             string
          status:               DbBookingStatus
          is_recurring:         boolean
          recurrence_series_id: string | null
          qr_token:             string | null
          is_admin_override:    boolean
          cancelled_at:         string | null
          cancelled_by:         string | null
          created_at:           string
          updated_at:           string
        }
        Insert: {
          id?:                   string
          profile_id:            string
          court_id:              string
          reservable_unit_id:    string
          sport_type:            DbSportType
          date:                  string
          start_time:            string
          end_time:              string
          status?:               DbBookingStatus
          is_recurring?:         boolean
          recurrence_series_id?: string | null
          qr_token?:             string | null
          is_admin_override?:    boolean
          cancelled_at?:         string | null
          cancelled_by?:         string | null
          created_at?:           string
          updated_at?:           string
        }
        Update: Partial<Database['public']['Tables']['bookings']['Insert']>
      }

      // ── booking_session_items ───────────────────────────────────────────────
      booking_session_items: {
        Row: {
          id:         string
          session_id: string
          booking_id: string
          profile_id: string
          created_at: string
        }
        Insert: {
          id?:         string
          session_id:  string
          booking_id:  string
          profile_id:  string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['booking_session_items']['Insert']>
      }

      // ── waitlist_entries ────────────────────────────────────────────────────
      waitlist_entries: {
        Row: {
          id:                  string
          profile_id:          string
          court_id:            string
          reservable_unit_id:  string | null
          sport_type:          DbSportType
          date:                string
          start_time:          string
          end_time:            string
          status:              DbWaitlistStatus
          promoted_booking_id: string | null
          created_at:          string
          updated_at:          string
        }
        Insert: {
          id?:                  string
          profile_id:           string
          court_id:             string
          reservable_unit_id?:  string | null
          sport_type:           DbSportType
          date:                 string
          start_time:           string
          end_time:             string
          status?:              DbWaitlistStatus
          promoted_booking_id?: string | null
          created_at?:          string
          updated_at?:          string
        }
        Update: Partial<Database['public']['Tables']['waitlist_entries']['Insert']>
      }

      // ── checkin_events ──────────────────────────────────────────────────────
      checkin_events: {
        Row: {
          id:                string
          booking_id:        string
          checked_in_by:     string
          checked_in_at:     string
          is_admin_override: boolean
          note:              string | null
        }
        Insert: {
          id?:                string
          booking_id:         string
          checked_in_by:      string
          checked_in_at?:     string
          is_admin_override?: boolean
          note?:              string | null
        }
        Update: Partial<Database['public']['Tables']['checkin_events']['Insert']>
      }

      // ── notifications_log ───────────────────────────────────────────────────
      notifications_log: {
        Row: {
          id:            string
          profile_id:    string
          booking_id:    string | null
          type:          DbNotificationType
          status:        DbNotificationStatus
          channel:       string
          error_message: string | null
          sent_at:       string
        }
        Insert: {
          id?:            string
          profile_id:     string
          booking_id?:    string | null
          type:           DbNotificationType
          status:         DbNotificationStatus
          channel?:       string
          error_message?: string | null
          sent_at?:       string
        }
        Update: Partial<Database['public']['Tables']['notifications_log']['Insert']>
      }

      // ── csv_import_logs ─────────────────────────────────────────────────────
      csv_import_logs: {
        Row: {
          id:             string
          imported_by:    string
          filename:       string
          total_rows:     number
          created_count:  number
          skipped_count:  number
          error_count:    number
          errors_json:    unknown | null
          created_at:     string
        }
        Insert: {
          id?:             string
          imported_by:     string
          filename:        string
          total_rows?:     number
          created_count?:  number
          skipped_count?:  number
          error_count?:    number
          errors_json?:    unknown | null
          created_at?:     string
        }
        Update: Partial<Database['public']['Tables']['csv_import_logs']['Insert']>
      }

      // ── audit_logs ──────────────────────────────────────────────────────────
      audit_logs: {
        Row: {
          id:           string
          actor_id:     string | null
          action:       string
          target_table: string | null
          target_id:    string | null
          old_data:     unknown | null
          new_data:     unknown | null
          created_at:   string
        }
        Insert: {
          id?:           string
          actor_id?:     string | null
          action:        string
          target_table?: string | null
          target_id?:    string | null
          old_data?:     unknown | null
          new_data?:     unknown | null
          created_at?:   string
        }
        Update: Partial<Database['public']['Tables']['audit_logs']['Insert']>
      }
    }

    // ── RPC FUNCTIONS ─────────────────────────────────────────────────────────
    Functions: {
      approve_registration: {
        Args: { p_request_id: string; p_admin_id: string }
        Returns: void
      }
      reject_registration: {
        Args: { p_request_id: string; p_admin_id: string }
        Returns: void
      }
      generate_member_id: {
        Args: Record<never, never>
        Returns: string
      }
      is_admin: {
        Args: Record<never, never>
        Returns: boolean
      }
      is_active_member: {
        Args: Record<never, never>
        Returns: boolean
      }
    }

    Enums: {
      user_role:           DbUserRole
      user_status:         DbUserStatus
      registration_status: DbRegistrationStatus
      court_type:          DbCourtType
      sport_type:          DbSportType
      unit_key:            DbUnitKey
      booking_status:      DbBookingStatus
      waitlist_status:     DbWaitlistStatus
      recurrence_freq:     DbRecurrenceFreq
      recurrence_status:   DbRecurrenceStatus
      notification_type:   DbNotificationType
      notification_status: DbNotificationStatus
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CONVENIENCE ROW TYPES
// Import these instead of Database['public']['Tables']['foo']['Row']
// ─────────────────────────────────────────────────────────────────────────────
type Tables = Database['public']['Tables']

export type ProfileRow             = Tables['profiles']['Row']
export type RegistrationRequestRow = Tables['registration_requests']['Row']
export type CourtRow               = Tables['courts']['Row']
export type ReservableUnitRow      = Tables['reservable_units']['Row']
export type WeeklySportRuleRow     = Tables['weekly_sport_rules']['Row']
export type BookingSettingsRow     = Tables['booking_settings']['Row']
export type BlackoutDateRow        = Tables['blackout_dates']['Row']
export type RecurrenceSeriesRow    = Tables['recurrence_series']['Row']
export type BookingRow             = Tables['bookings']['Row']
export type BookingSessionItemRow  = Tables['booking_session_items']['Row']
export type WaitlistEntryRow       = Tables['waitlist_entries']['Row']
export type CheckinEventRow        = Tables['checkin_events']['Row']
export type NotificationsLogRow    = Tables['notifications_log']['Row']
export type CsvImportLogRow        = Tables['csv_import_logs']['Row']
export type AuditLogRow            = Tables['audit_logs']['Row']
