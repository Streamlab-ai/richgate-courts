// Public guest booking page — always accessible.
// When monetization is OFF, booking is free (no payment).
// When monetization is ON, guests pay via GCash.

import { db } from '@/lib/db'
import Link from 'next/link'
import { BRANDING } from '@/lib/branding'
import GuestBookingForm from './GuestBookingForm'

async function getMonetizationStatus() {
  try {
    const row = await db.appSetting.findUnique({ where: { key: 'monetization_enabled' } })
    return (row?.value ?? 'false') === 'true'
  } catch {
    return false
  }
}

async function getCourts() {
  return db.court.findMany({
    where: { isActive: true },
    select: { id: true, name: true, courtType: true },
    orderBy: { name: 'asc' },
  })
}

async function getPricing() {
  const keys = ['price_per_hour_tennis', 'price_per_hour_pickleball', 'price_per_hour_basketball']
  const rows = await db.appSetting.findMany({ where: { key: { in: keys } } })
  const map = Object.fromEntries(rows.map(r => [r.key, Number(r.value)]))
  return {
    tennis:     map['price_per_hour_tennis']     ?? 200,
    pickleball: map['price_per_hour_pickleball'] ?? 200,
    basketball: map['price_per_hour_basketball'] ?? 400,
  }
}

export default async function GuestBookPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const [monetizationEnabled, courts, pricing] = await Promise.all([
    getMonetizationStatus(),
    getCourts(),
    getPricing(),
  ])

  return (
    <div className="flex flex-col items-center justify-start min-h-screen px-5 py-10">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-7 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-black rounded-2xl mb-3">
            <span className="text-white text-2xl">{BRANDING.icon}</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight">{BRANDING.shortName}</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Guest court booking</p>
        </div>

        {error === 'payment_failed' && (
          <p className="text-sm text-red-500 bg-red-50 px-4 py-3 rounded-xl mb-4 text-center">
            Your payment was not completed. Please try again.
          </p>
        )}

        <GuestBookingForm courts={courts} pricing={pricing} monetizationEnabled={monetizationEnabled} />

        <p className="text-center text-sm text-zinc-400 mt-6">
          Already a member?{' '}
          <Link href="/login" className="text-black font-medium hover:underline underline-offset-2">
            Sign in
          </Link>
        </p>

        <p className="text-center text-xs text-zinc-400 mt-8">
          Built by{' '}
          <a href={BRANDING.createdByUrlFull} target="_blank" rel="noopener noreferrer" className="hover:text-zinc-600">
            {BRANDING.createdBy}
          </a>
        </p>
      </div>
    </div>
  )
}
