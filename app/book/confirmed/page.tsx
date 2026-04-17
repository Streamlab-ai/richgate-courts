import { db } from '@/lib/db'
import Link from 'next/link'
import { BRANDING } from '@/lib/branding'

export default async function BookConfirmedPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; test?: string }>
}) {
  const { ref, test } = await searchParams

  let booking = null
  if (ref) {
    booking = await db.booking.findUnique({
      where: { id: ref },
      include: { court: { select: { name: true } } },
    })
  }

  const isTest = test === '1'

  if (!booking) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-5 py-12 text-center">
        <span className="text-4xl mb-4">❓</span>
        <h1 className="text-xl font-bold mb-2">Booking not found</h1>
        <p className="text-sm text-zinc-500 mb-6">The booking reference is invalid or has expired.</p>
        <Link href="/book" className="text-sm font-medium text-black underline-offset-2 hover:underline">
          Make a new booking
        </Link>
      </div>
    )
  }

  const isPending = booking.status === 'pending_payment'
  const isConfirmed = booking.status === 'confirmed'

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-5 py-12">
      <div className="w-full max-w-sm">

        {/* Status icon */}
        <div className="text-center mb-6">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 ${
            isConfirmed ? 'bg-emerald-50' : 'bg-amber-50'
          }`}>
            <span className="text-3xl">{isConfirmed ? '✅' : '⏳'}</span>
          </div>
          <h1 className="text-xl font-bold">
            {isConfirmed ? 'Booking confirmed!' : 'Awaiting payment…'}
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            {isConfirmed
              ? 'Your court is reserved. See you on the court!'
              : 'Complete your GCash payment to confirm this slot.'}
          </p>
          {isTest && (
            <p className="text-xs text-amber-600 bg-amber-50 rounded-xl px-3 py-2 mt-3">
              Test mode — payment not processed
            </p>
          )}
        </div>

        {/* Booking details card */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 flex flex-col gap-3 mb-6">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Booking ref</span>
            <span className="font-mono font-medium">{booking.id.slice(0, 8).toUpperCase()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Name</span>
            <span className="font-medium">{booking.guestName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Court</span>
            <span className="font-medium">{booking.court.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Sport</span>
            <span className="font-medium capitalize">{booking.sportType}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Date</span>
            <span className="font-medium">{booking.date}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Time</span>
            <span className="font-medium">{booking.startTime} – {booking.endTime}</span>
          </div>
          {isConfirmed && booking.amountPaid && booking.amountPaid > 0 && (
            <div className="flex justify-between text-sm border-t border-zinc-100 pt-3 mt-1">
              <span className="text-zinc-500">Amount paid</span>
              <span className="font-semibold text-emerald-700">₱{booking.amountPaid / 100}</span>
            </div>
          )}
        </div>

        {isConfirmed && (
          <p className="text-xs text-zinc-400 text-center mb-6">
            A confirmation email has been sent to <span className="font-medium">{booking.guestEmail}</span>
          </p>
        )}

        <div className="flex flex-col gap-3">
          <Link
            href="/book"
            className="w-full text-center py-3 px-4 bg-black text-white rounded-2xl text-sm font-medium hover:bg-zinc-800 transition-colors"
          >
            Book another court
          </Link>
          <Link
            href="/login"
            className="w-full text-center py-3 px-4 bg-white border border-zinc-200 text-zinc-700 rounded-2xl text-sm font-medium hover:border-zinc-400 transition-colors"
          >
            Member? Sign in
          </Link>
        </div>

        <p className="text-center text-xs text-zinc-400 mt-8">
          {BRANDING.shortName} · Built by{' '}
          <a href={BRANDING.createdByUrlFull} target="_blank" rel="noopener noreferrer" className="hover:text-zinc-600">
            {BRANDING.createdBy}
          </a>
        </p>
      </div>
    </div>
  )
}
