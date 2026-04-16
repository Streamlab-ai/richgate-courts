import Link from 'next/link'

export default function PendingApprovalPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-5 text-center">
      <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-6">
        <span className="text-3xl">⏳</span>
      </div>
      <h1 className="text-2xl font-semibold mb-2">Application under review</h1>
      <p className="text-zinc-500 text-sm max-w-xs leading-relaxed">
        Your membership application has been submitted. An admin will review it shortly.
        You'll receive a notification once approved.
      </p>
      <form action="/api/auth/logout" method="POST" className="mt-8">
        <button type="submit" className="text-sm text-zinc-400 hover:text-zinc-700">
          Sign out
        </button>
      </form>
    </div>
  )
}
