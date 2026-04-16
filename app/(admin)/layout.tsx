'use client'

import { useState } from 'react'
import Link from 'next/link'
import { BRANDING } from '@/lib/branding'

const NAV = [
  { href: '/dashboard',      label: 'Dashboard',     icon: '📊' },
  { href: '/registrations',  label: 'Registrations', icon: '📋' },
  { href: '/members',        label: 'Members',       icon: '👥' },
  { href: '/bookings',       label: 'Bookings',      icon: '📅' },
  { href: '/waitlists',      label: 'Waitlist',      icon: '⏳' },
  { href: '/checkin',        label: 'Check-in',      icon: '✅' },
  { href: '/reports',        label: 'Reports',       icon: '📈' },
  { href: '/settings',       label: 'Settings',      icon: '⚙️' },
  { href: '/blackout-dates', label: 'Blackouts',     icon: '🚫' },
  { href: '/sport-rules',    label: 'Sport Rules',   icon: '📐' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen flex bg-[#f5f5f7]">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex flex-col w-56 bg-white border-r border-zinc-200 py-6 px-3 shrink-0">
        <div className="px-3 mb-8">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{BRANDING.icon}</span>
            <div className="flex flex-col">
              <span className="font-semibold text-sm leading-tight">{BRANDING.shortName}</span>
              <span className="text-[10px] text-zinc-400">{BRANDING.subtitle}</span>
            </div>
          </div>
          <span className="text-[10px] text-zinc-400 font-medium">Admin Panel</span>
        </div>
        <nav className="flex flex-col gap-0.5">
          {NAV.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto pt-6 border-t border-zinc-200 px-3">
          <p className="text-[10px] text-zinc-400 mb-3">Powered by</p>
          <a
            href={BRANDING.createdByUrlFull}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-medium text-zinc-500 hover:text-black transition-colors flex items-center gap-1"
          >
            {BRANDING.createdBy} ↗
          </a>
          <form action="/api/auth/logout" method="POST" className="mt-4">
            <button className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors">Sign out</button>
          </form>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header (hamburger) */}
        <div className="md:hidden sticky top-0 bg-white border-b border-zinc-200 px-4 py-3 flex items-center justify-between z-40">
          <div className="flex items-center gap-2">
            <span className="text-lg">{BRANDING.icon}</span>
            <span className="text-xs font-semibold">{BRANDING.shortName}</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-zinc-600 hover:text-zinc-900 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile menu drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 bg-black/50 z-30" onClick={() => setMobileMenuOpen(false)} />
        )}
        <div className={`md:hidden fixed left-0 right-0 top-16 bg-white border-b border-zinc-200 z-40 transition-all duration-200 overflow-hidden ${mobileMenuOpen ? 'max-h-screen' : 'max-h-0'}`}>
          <nav className="flex flex-col py-2">
            {NAV.map(item => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors border-b border-zinc-100 last:border-b-0"
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="px-4 py-3 border-t border-zinc-200 space-y-2">
            <a
              href={BRANDING.createdByUrlFull}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-medium text-zinc-500 hover:text-black transition-colors flex items-center gap-1"
            >
              {BRANDING.createdBy} ↗
            </a>
            <form action="/api/auth/logout" method="POST">
              <button className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors">Sign out</button>
            </form>
          </div>
        </div>

        <main className="flex-1 px-4 py-6 max-w-4xl w-full mx-auto pb-24 md:pb-6">
          {children}
        </main>
      </div>
    </div>
  )
}
