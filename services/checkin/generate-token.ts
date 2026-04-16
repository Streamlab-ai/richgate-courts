import { nanoid } from '@/services/booking/nanoid'

/** Generate a URL-safe QR token (12 chars, stored in bookings.qr_token) */
export function generateQrToken(): string {
  return nanoid(12)
}
