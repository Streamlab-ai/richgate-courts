// GET /api/pricing — public endpoint, returns current court fees
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

const KEYS = [
  'monetization_enabled',
  'price_per_hour_tennis',
  'price_per_hour_pickleball',
  'price_per_hour_basketball',
]

export async function GET() {
  try {
    const rows = await db.appSetting.findMany({ where: { key: { in: KEYS } } })
    const map = Object.fromEntries(rows.map(r => [r.key, r.value]))

    return NextResponse.json({
      monetizationEnabled: (map['monetization_enabled'] ?? 'false') === 'true',
      tennis:     Number(map['price_per_hour_tennis']     ?? 200),
      pickleball: Number(map['price_per_hour_pickleball'] ?? 200),
      basketball: Number(map['price_per_hour_basketball'] ?? 400),
    })
  } catch {
    // Return safe defaults if DB read fails
    return NextResponse.json({
      monetizationEnabled: false,
      tennis: 200, pickleball: 200, basketball: 400,
    })
  }
}
