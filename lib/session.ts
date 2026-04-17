import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const COOKIE_NAME = 'auth-token'
const SESSION_DURATION = 60 * 60 * 24 * 7 // 7 days in seconds

const DEV_SECRET_PREFIX = 'richgate-local-dev'
let secretWarningLogged = false

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error('SESSION_SECRET env var is not set')
  // Warn (don't block) if the dev default is used in production
  if (process.env.NODE_ENV === 'production' && secret.startsWith(DEV_SECRET_PREFIX) && !secretWarningLogged) {
    console.warn('⚠️  SESSION_SECRET is using the dev default — change it in production! Use: openssl rand -base64 48')
    secretWarningLogged = true
  }
  if (secret.length < 32) {
    console.warn('⚠️  SESSION_SECRET is shorter than 32 characters — use a longer secret')
  }
  return new TextEncoder().encode(secret)
}

export interface SessionPayload {
  sub: string   // profile id
  email: string
  role: string  // 'super_admin' | 'admin' | 'hoa' | 'bptl' | 'guard'
  status: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Create + set session cookie (call from API routes)
// ─────────────────────────────────────────────────────────────────────────────
export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(getSecret())

  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DURATION,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Read session from cookie (Server Components / Route Handlers)
// ─────────────────────────────────────────────────────────────────────────────
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyToken(token)
}

// ─────────────────────────────────────────────────────────────────────────────
// Verify a raw token string (used in proxy.ts — no cookies() import there)
// ─────────────────────────────────────────────────────────────────────────────
export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Clear session cookie (logout)
// ─────────────────────────────────────────────────────────────────────────────
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}
