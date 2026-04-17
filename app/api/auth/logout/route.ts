import { NextRequest, NextResponse } from 'next/server'
import { clearSession } from '@/lib/session'

export async function POST(request: NextRequest) {
  await clearSession()
  return NextResponse.redirect(new URL('/login', request.url), { status: 303 })
}

export async function GET(request: NextRequest) {
  await clearSession()
  return NextResponse.redirect(new URL('/login', request.url), { status: 303 })
}
