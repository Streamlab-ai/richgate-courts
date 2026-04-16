/**
 * Domain types — re-exported from database types for convenience.
 * Import from here in components and services.
 */

export type {
  Database,
  DbUserRole        as UserRole,
  DbUserStatus      as UserStatus,
  DbRegistrationStatus as RegistrationStatus,
  DbCourtType       as CourtType,
  DbSportType       as SportType,
  DbUnitKey         as ReservableUnitKey,
  DbBookingStatus   as BookingStatus,
  DbWaitlistStatus  as WaitlistStatus,
  DbRecurrenceFreq  as RecurrenceFrequency,
  DbRecurrenceStatus as RecurrenceStatus,
  DbNotificationType as NotificationType,
  DbNotificationStatus as NotificationStatus,
  // Row types
  ProfileRow             as Profile,
  RegistrationRequestRow as RegistrationRequest,
  CourtRow               as Court,
  ReservableUnitRow      as ReservableUnit,
  WeeklySportRuleRow     as WeeklySportRule,
  BookingSettingsRow     as BookingSettings,
  BlackoutDateRow        as BlackoutDate,
  RecurrenceSeriesRow    as RecurrenceSeries,
  BookingRow             as Booking,
  BookingSessionItemRow  as BookingSessionItem,
  WaitlistEntryRow       as WaitlistEntry,
  CheckinEventRow        as CheckinEvent,
  NotificationsLogRow    as NotificationsLog,
  CsvImportLogRow        as CsvImportLog,
  AuditLogRow            as AuditLog,
} from '@/types/database'

// ─────────────────────────────────────────────────────────────────────────────
// UI / APP-ONLY TYPES
// These are not stored in the database — used for client-side state only.
// ─────────────────────────────────────────────────────────────────────────────

import type { DbSportType, DbUnitKey, DbRecurrenceFreq } from '@/types/database'

export interface SlotOption {
  date:            string      // YYYY-MM-DD
  start_time:      string      // HH:MM
  end_time:        string
  sport_type:      DbSportType
  available_units: DbUnitKey[]
  is_full:         boolean
}

export interface BookingSessionDraft {
  court_id:   string
  sport_type: DbSportType
  slots: Array<{
    date:       string
    start_time: string
    end_time:   string
    unit_key:   DbUnitKey
  }>
  recurrence?: {
    enabled:    boolean
    frequency:  DbRecurrenceFreq
    end_date:   string
  }
}

export interface BookingValidationError {
  slot_index: number
  date:       string
  start_time: string
  reason:     string
}
