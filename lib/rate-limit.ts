// ─────────────────────────────────────────────────────────────────────────────
// In-memory sliding-window rate limiter.
// Works per serverless instance — not shared across Vercel functions, but still
// effective against single-source brute-force attacks hitting the same instance.
// For production-grade distributed rate limiting, swap for @upstash/ratelimit.
// ─────────────────────────────────────────────────────────────────────────────

interface Entry { timestamps: number[] }

const store = new Map<string, Entry>()

// Evict stale entries every 5 minutes to prevent memory leaks
const CLEANUP_INTERVAL = 5 * 60 * 1000
let lastCleanup = Date.now()

function cleanup(windowMs: number) {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  const cutoff = now - windowMs
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter(t => t > cutoff)
    if (entry.timestamps.length === 0) store.delete(key)
  }
}

/**
 * Check if a key has exceeded the rate limit.
 * @param key    Unique identifier (e.g., IP address, email, "ip:email")
 * @param limit  Max requests allowed in the window
 * @param windowMs  Window duration in milliseconds
 * @returns { limited: boolean, remaining: number, retryAfterMs: number }
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { limited: boolean; remaining: number; retryAfterMs: number } {
  cleanup(windowMs)

  const now = Date.now()
  const cutoff = now - windowMs
  let entry = store.get(key)

  if (!entry) {
    entry = { timestamps: [] }
    store.set(key, entry)
  }

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter(t => t > cutoff)

  if (entry.timestamps.length >= limit) {
    const oldestInWindow = entry.timestamps[0]
    return { limited: true, remaining: 0, retryAfterMs: oldestInWindow + windowMs - now }
  }

  entry.timestamps.push(now)
  return { limited: false, remaining: limit - entry.timestamps.length, retryAfterMs: 0 }
}
