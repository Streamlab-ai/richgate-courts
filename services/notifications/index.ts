// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION SERVICE  (local simulation — logs to console + DB)
// Replace the internals with a real provider (Resend, etc.) for production.
// ─────────────────────────────────────────────────────────────────────────────

import { db } from '@/lib/db'

export type NotificationType =
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'waitlist_joined'
  | 'waitlist_promoted'
  | 'checkin_reminder'
  | 'recurring_summary'
  | 'member_approved'
  | 'member_rejected'

interface SendNotificationInput {
  profileId: string
  type: NotificationType | string
  subject: string
  body: string
  channel?: string
}

export async function sendNotification(input: SendNotificationInput): Promise<void> {
  const { profileId, type, subject, body, channel = 'email' } = input

  console.log(`\n📬 [NOTIFICATION] type=${type} channel=${channel}`)
  console.log(`   To: ${profileId}`)
  console.log(`   Subject: ${subject}`)
  console.log(`   Body: ${body}\n`)

  try {
    await db.notificationsLog.create({
      data: { profileId, type, channel, status: 'sent', subject, body },
    })
  } catch {
    // Non-critical
  }
}

// Convenience wrappers (kept for backwards-compat with old imports)
export async function sendBookingConfirmation(profileId: string, details: string) {
  return sendNotification({ profileId, type: 'booking_confirmed', subject: 'Booking confirmed', body: details })
}
export async function sendBookingCancellation(profileId: string, details: string) {
  return sendNotification({ profileId, type: 'booking_cancelled', subject: 'Booking cancelled', body: details })
}
export async function sendWaitlistPromotion(profileId: string, details: string) {
  return sendNotification({ profileId, type: 'waitlist_promoted', subject: 'Slot available!', body: details })
}
export async function sendRecurringSummary(profileId: string, details: string) {
  return sendNotification({ profileId, type: 'recurring_summary', subject: 'Recurring booking summary', body: details })
}
