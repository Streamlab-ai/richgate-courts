/**
 * QR Check-in Engine
 *
 * Handles:
 * - generating booking QR tokens
 * - validating check-in window
 * - preventing duplicate check-ins
 * - storing check-in events
 */

export { generateQrToken } from './generate-token'
export { processCheckin } from './process-checkin'
