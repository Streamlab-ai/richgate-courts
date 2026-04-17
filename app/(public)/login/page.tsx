'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Login failed'); return }
      router.push(data.redirect ?? '/home')
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-5 py-12">
      <div className="w-full max-w-sm">
        {/* Logo mark */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-black rounded-2xl mb-4">
            <span className="text-white text-2xl">🎾</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight">Richgate Square Court</h1>
          <p className="text-sm font-medium text-zinc-600">Reservation System</p>
          <p className="text-zinc-400 text-xs mt-3">Sign in to your club account</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <Input
            id="password"
            label="Password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />

          {error && (
            <p className="text-sm text-red-500 bg-red-50 px-4 py-3 rounded-xl">{error}</p>
          )}

          <Button type="submit" size="lg" loading={loading} className="mt-1 w-full">
            Sign in
          </Button>
        </form>

        <p className="text-center text-sm text-zinc-500 mt-4">
          <Link href="/reset-password" className="text-zinc-400 hover:text-zinc-600 transition-colors text-xs">
            Forgot password?
          </Link>
        </p>

        <p className="text-center text-sm text-zinc-500 mt-4">
          Not a member?{' '}
          <Link href="/register" className="text-black font-medium underline-offset-2 hover:underline">
            Request access
          </Link>
        </p>

        <div className="mt-5 pt-5 border-t border-zinc-200 text-center">
          <p className="text-xs text-zinc-400 mb-2">Just want to book a court?</p>
          <Link
            href="/book"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-sm font-medium rounded-xl transition-colors"
          >
            🎾 Book as guest
          </Link>
        </div>

        <p className="text-center text-xs text-zinc-400 mt-10">
          Built by{' '}
          <a href="https://streamlabai.com" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-600 transition-colors">
            StreamLab Ai
          </a>
        </p>
      </div>
    </div>
  )
}
