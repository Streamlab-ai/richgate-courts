import Link from 'next/link'
import { getSession } from '@/lib/session'
import { BRANDING } from '@/lib/branding'

const NAV = [
  { href: '/home',         label: 'Home',        icon: '🏠' },
  { href: '/reserve',      label: 'Book',        icon: '📅' },
  { href: '/reservations', label: 'My Bookings', icon: '🎾' },
  { href: '/profile',      label: 'Profile',     icon: '👤' },
]

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  const isAdmin = session?.role === 'admin'

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f5f7]">
      {/* Top header */}
      <div className="sticky top-0 bg-white/80 backdrop-blur border-b border-zinc-200 z-40">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{BRANDING.icon}</span>
            <div className="flex flex-col leading-tight">
              <span className="text-xs font-semibold">{BRANDING.shortName}</span>
              <span className="text-[10px] text-zinc-400">{BRANDING.subtitle}</span>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 px-4 py-6 max-w-lg mx-auto w-full pb-24">
        {children}
      </main>

      {/* Bottom nav bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur border-t border-zinc-200 safe-bottom z-50">
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
          {isAdmin && (
            <Link
              href="/dashboard"
              className="flex flex-1 flex-col items-center gap-0.5 py-2 text-zinc-500 hover:text-black transition-colors"
            >
              <span className="text-lg">⚙️</span>
              <span className="text-[10px] font-medium">Admin</span>
            </Link>
          )}
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
