// Next.js instrumentation hook — runs once on server cold start.
// https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

export async function register() {
  // Only run in Node.js runtime (not Edge), and only in production or when DB is configured
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.DATABASE_URL?.startsWith('postgres')) {
    const { runStartup } = await import('./lib/startup')
    await runStartup()
  }
}
