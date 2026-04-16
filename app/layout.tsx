import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Courts Reservation',
  description: 'Club court reservation system',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-[#f5f5f7] text-[#1d1d1f]">{children}</body>
    </html>
  )
}
