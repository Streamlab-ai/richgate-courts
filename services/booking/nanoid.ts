import { randomBytes } from 'crypto'

/** Generate a URL-safe random string of length n */
export function nanoid(n = 12): string {
  return randomBytes(Math.ceil(n * 3 / 4))
    .toString('base64url')
    .slice(0, n)
}
