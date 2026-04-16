// ─────────────────────────────────────────────────────────────────────────────
// BOOKING ENGINE  — shared types
// ─────────────────────────────────────────────────────────────────────────────

export type SportType = 'tennis' | 'basketball' | 'pickleball'
export type CourtType = 'tennis' | 'multipurpose'

export interface TimeSlot {
  date: string      // YYYY-MM-DD
  startTime: string // HH:MM
  endTime: string
}

export interface BookingRequest {
  memberId: string
  courtId: string
  sportType: SportType
  slots: TimeSlot[]
  adminOverride?: boolean
}

export interface BookingResult {
  success: boolean
  bookingId?: string
  error?: string
}

export interface MultiBookingResult {
  succeeded: Array<{ slot: TimeSlot; bookingId: string }>
  failed: Array<{ slot: TimeSlot; reason: string }>
}

export interface SlotAvailability {
  date: string
  startTime: string
  endTime: string
  available: boolean
  reason?: string            // why it is blocked
  pickleballSlotsLeft?: number
}

export interface ConflictCheckResult {
  hasConflict: boolean
  reason?: string
}

export interface LimitCheckResult {
  allowed: boolean
  reason?: string
}
