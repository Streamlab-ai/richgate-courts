import Link from 'next/link'

const NAV = [
  { href: '/home',         label: 'Home',    icon: '🏠' },
  { href: '/reserve',      label: 'Book',    icon: '📅' },
  { href: '/reservations', label: 'My Bookings', icon: '🎾' },
  { href: '/profile',      label: 'Profile', icon: '👤' },
]

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#f5f5f7]">
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
        </div>
      </nav>
    </div>
  )
}
