import Link from 'next/link'
import { requireGuardOrAdminSession } from '@/lib/auth'
import { BRANDING } from '@/lib/branding'

const NAV = [
  { href: '/guard',    label: 'Bookings', icon: '📋' },
  { href: '/profile',  label: 'Profile',  icon: '👤' },
]

export default async function GuardLayout({ children }: { children: React.ReactNode }) {
  await requireGuardOrAdminSession()
  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      {/* Top header */}
      <div className="sticky top-0 bg-white border-b border-zinc-200 z-40">
        <div className="max-w-lg mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-lg">{BRANDING.icon}</span>
            <div className="flex flex-col leading-tight">
              <span className="text-xs font-semibold">{BRANDING.shortName}</span>
              <span className="text-[10px] text-zinc-400">Security Access</span>
            </div>
          </div>
          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">Guard</span>
        </div>
      </div>

      <main className="max-w-lg mx-auto px-4 py-6 pb-24">
        {children}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur border-t border-zinc-200 z-50">
        <div className="flex max-w-lg mx-auto">
          {NAV.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-1 flex-col items-center gap-0.5 py-2 text-zinc-500 hover:text-black transition-colors"
            >
              <span className="text-lg">{item.icon}</span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          ))}
          <a
            href="/api/auth/logout"
            className="flex flex-1 flex-col items-center gap-0.5 py-2 text-zinc-400 hover:text-red-500 transition-colors"
          >
            <span className="text-lg">🚪</span>
            <span className="text-[10px] font-medium">Sign out</span>
          </a>
        </div>
      </nav>
    </div>
  )
}
