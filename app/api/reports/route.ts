// GET /api/reports?type=utilization|members|waitlist|checkin
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { getMonthRange } from '@/services/booking/time-utils'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = request.nextUrl
  const type  = searchParams.get('type') ?? 'utilization'
  const month = searchParams.get('month') ?? new Date().toISOString().slice(0, 7)  // YYYY-MM

  const dateStr = `${month}-01`
  const { monthStart, monthEnd } = getMonthRange(dateStr)

  if (type === 'utilization') {
    const bookings = await db.booking.groupBy({
      by: ['courtId', 'sportType'],
      where: { date: { gte: monthStart, lte: monthEnd }, status: { in: ['confirmed', 'completed'] } },
      _count: { id: true },
      _sum: { durationMinutes: true },
    })
    const courts = await db.court.findMany({ select: { id: true, name: true } })
    const courtMap = Object.fromEntries(courts.map(c => [c.id, c.name]))
    const data = bookings.map(b => ({
      court: courtMap[b.courtId] ?? b.courtId,
      sportType: b.sportType,
      bookingCount: b._count.id,
      totalHours: ((b._sum.durationMinutes ?? 0) / 60).toFixed(1),
    }))
    return NextResponse.json({ type, month, data })
  }

  if (type === 'members') {
    const topMembers = await db.booking.groupBy({
      by: ['memberId'],
      where: { date: { gte: monthStart, lte: monthEnd }, status: { in: ['confirmed', 'completed'] } },
      _count: { id: true },
      _sum: { durationMinutes: true },
      orderBy: { _sum: { durationMinutes: 'desc' } },
      take: 20,
    })
    const profiles = await db.profile.findMany({
      where: { id: { in: topMembers.map(m => m.memberId) } },
      select: { id: true, fullName: true, memberId: true },
    })
    const profileMap = Object.fromEntries(profiles.map(p => [p.id, p]))
    const data = topMembers.map(m => ({
      ...profileMap[m.memberId],
      bookingCount: m._count.id,
      totalHours: ((m._sum.durationMinutes ?? 0) / 60).toFixed(1),
    }))
    return NextResponse.json({ type, month, data })
  }

  if (type === 'waitlist') {
    const entries = await db.waitlistEntry.findMany({
      where: { createdAt: { gte: new Date(monthStart), lte: new Date(monthEnd + 'T23:59:59') } },
      include: { member: { select: { fullName: true, memberId: true } } },
      orderBy: { createdAt: 'desc' },
    })
    const summary = {
      total: entries.length,
      waiting: entries.filter(e => e.status === 'waiting').length,
      promoted: entries.filter(e => e.status === 'booked').length,
      expired: entries.filter(e => e.status === 'expired').length,
    }
    return NextResponse.json({ type, month, summary, entries })
  }

  if (type === 'checkin') {
    const checkins = await db.checkinEvent.findMany({
      where: { checkedInAt: { gte: new Date(monthStart), lte: new Date(monthEnd + 'T23:59:59') } },
      include: {
        member: { select: { fullName: true, memberId: true } },
        booking: { select: { date: true, startTime: true, sportType: true, court: { select: { name: true } } } },
      },
      orderBy: { checkedInAt: 'desc' },
    })
    return NextResponse.json({ type, month, count: checkins.length, checkins })
  }

  return NextResponse.json({ error: 'Unknown report type' }, { status: 400 })
}
