'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

// ─────────────────────────────────────────────────────────────────────────────
// Request form — asks for email, sends reset link
// ─────────────────────────────────────────────────────────────────────────────
function RequestForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Something went wrong'); return }
      setSent(true)
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-green-50 rounded-2xl mb-4">
          <span className="text-2xl">📬</span>
        </div>
        <h1 className="text-xl font-bold mb-2">Check your email</h1>
        <p className="text-sm text-zinc-500 mb-6">
          If <span className="font-medium text-zinc-700">{email}</span> is registered,
          you'll receive a reset link shortly.
        </p>
        <Link href="/login" className="text-sm text-black font-medium underline-offset-2 hover:underline">
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-black rounded-2xl mb-4">
          <span className="text-white text-2xl">🔑</span>
        </div>
        <h1 className="text-xl font-bold tracking-tight">Forgot password?</h1>
        <p className="text-sm text-zinc-500 mt-1">Enter your email to receive a reset link</p>
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

        {error && (
          <p className="text-sm text-red-500 bg-red-50 px-4 py-3 rounded-xl">{error}</p>
        )}

        <Button type="submit" size="lg" loading={loading} className="mt-1 w-full">
          Send reset link
        </Button>
      </form>

      <p className="text-center text-sm text-zinc-500 mt-6">
        <Link href="/login" className="text-black font-medium underline-offset-2 hover:underline">
          Back to sign in
        </Link>
      </p>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Confirm form — sets new password using token from URL
// ─────────────────────────────────────────────────────────────────────────────
function ConfirmForm({ token }: { token: string }) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Something went wrong'); return }
      setDone(true)
      setTimeout(() => router.push('/login'), 2000)
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-green-50 rounded-2xl mb-4">
          <span className="text-2xl">✅</span>
        </div>
        <h1 className="text-xl font-bold mb-2">Password updated!</h1>
        <p className="text-sm text-zinc-500">Redirecting you to sign in…</p>
      </div>
    )
  }

  return (
    <>
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-black rounded-2xl mb-4">
          <span className="text-white text-2xl">🔒</span>
        </div>
        <h1 className="text-xl font-bold tracking-tight">Set new password</h1>
        <p className="text-sm text-zinc-500 mt-1">Choose a strong password (min. 8 characters)</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          id="password"
          label="New password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <Input
          id="confirm"
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          required
        />

        {error && (
          <p className="text-sm text-red-500 bg-red-50 px-4 py-3 rounded-xl">{error}</p>
        )}

        <Button type="submit" size="lg" loading={loading} className="mt-1 w-full">
          Update password
        </Button>
      </form>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page — detects ?token= and renders the right form
// ─────────────────────────────────────────────────────────────────────────────
function ResetPasswordContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-5 py-12">
      <div className="w-full max-w-sm">
        {token ? <ConfirmForm token={token} /> : <RequestForm />}

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

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordContent />
    </Suspense>
  )
}
