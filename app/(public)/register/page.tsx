'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm]       = useState({ fullName: '', email: '', phone: '', password: '', confirm: '' })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  function set(k: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) { setError('Passwords do not match'); return }
    setLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: form.fullName, email: form.email, phone: form.phone, password: form.password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Registration failed'); return }
      router.push('/pending')
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-black rounded-2xl mb-4">
            <span className="text-white text-2xl">🎾</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Request access</h1>
          <p className="text-zinc-500 text-sm mt-1">An admin will review your application</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input id="fullName" label="Full name" placeholder="Jane Smith" value={form.fullName} onChange={set('fullName')} required />
          <Input id="email" label="Email" type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} required />
          <Input id="phone" label="Phone (optional)" type="tel" placeholder="+61 400 000 000" value={form.phone} onChange={set('phone')} />
          <Input id="password" label="Password" type="password" placeholder="Min. 8 characters" value={form.password} onChange={set('password')} required />
          <Input id="confirm" label="Confirm password" type="password" placeholder="••••••••" value={form.confirm} onChange={set('confirm')} required />

          {error && (
            <p className="text-sm text-red-500 bg-red-50 px-4 py-3 rounded-xl">{error}</p>
          )}

          <Button type="submit" size="lg" loading={loading} className="mt-1 w-full">
            Submit application
          </Button>
        </form>

        <p className="text-center text-sm text-zinc-500 mt-6">
          Already a member?{' '}
          <Link href="/login" className="text-black font-medium underline-offset-2 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
