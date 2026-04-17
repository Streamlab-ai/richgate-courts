// Standalone layout for the public guest booking flow.
// No auth, no shared layout with the member/admin sections.
export default function BookLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      {children}
    </div>
  )
}
