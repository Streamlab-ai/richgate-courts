// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION SERVICE  — sends via Resend if API key is set, otherwise logs
// ─────────────────────────────────────────────────────────────────────────────

import { db } from '@/lib/db'
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'

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

  // Get the member's email address
  let toEmail: string | null = null
  try {
    const profile = await db.profile.findUnique({ where: { id: profileId }, select: { email: true } })
    toEmail = profile?.email ?? null
  } catch { /* non-critical */ }

  // Send via Resend if configured
  if (resend && toEmail) {
    try {
      await resend.emails.send({
        from: `Richgate Courts <${FROM}>`,
        to: toEmail,
        subject,
        html: `
          <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px">
            <div style="margin-bottom:24px">
              <span style="font-size:24px">🎾</span>
              <strong style="margin-left:8px">Richgate Courts</strong>
            </div>
            <p style="font-size:16px;line-height:1.6;color:#1d1d1f">${body.replace(/\n/g, '<br>')}</p>
            <hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0">
            <p style="font-size:12px;color:#999">Richgate Square Court Reservation System · Built by <a href="https://streamlabai.com" style="color:#999">StreamLab Ai</a></p>
          </div>
        `,
      })
    } catch (err) {
      console.error('[NOTIFICATION] Resend error:', err)
    }
  } else {
    console.log(`\n📬 [NOTIFICATION] type=${type} to=${toEmail ?? profileId}`)
    console.log(`   Subject: ${subject}`)
    console.log(`   Body: ${body}\n`)
  }

  try {
    await db.notificationsLog.create({
      data: { profileId, type, channel, status: 'sent', subject, body },
    })
  } catch { /* non-critical */ }
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
