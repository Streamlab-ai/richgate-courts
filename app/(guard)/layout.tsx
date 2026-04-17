import { requireGuardOrAdmin } from '@/lib/auth'
import { BRANDING } from '@/lib/branding'

export default async function GuardLayout({ children }: { children: React.ReactNode }) {
  await requireGuardOrAdmin()
  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      <div className="sticky top-0 bg-white border-b border-zinc-200 z-40">
        <div className="max-w-lg mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-lg">{BRANDING.icon}</span>
            <div className="flex flex-col leading-tight">
              <span className="text-xs font-semibold">{BRANDING.shortName}</span>
              <span className="text-[10px] text-zinc-400">Security Access</span>
            </div>
          </div>
          <a href="/api/auth/logout" className="text-xs text-zinc-400 hover:text-red-500 transition-colors">
            Sign out
          </a>
        </div>
      </div>
      <main className="max-w-lg mx-auto px-4 py-6 pb-10">
        {children}
      </main>
    </div>
  )
}
