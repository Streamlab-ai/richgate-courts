import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database…')

  // ── Courts ──────────────────────────────────────────────────────────────────
  const tennis = await db.court.upsert({
    where: { id: '00000000-0000-0000-0001-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0001-000000000001',
      name: 'Tennis Court',
      courtType: 'tennis',
      description: 'Full-size tennis court — exclusive booking',
      isActive: true,
    },
  })

  const multi = await db.court.upsert({
    where: { id: '00000000-0000-0000-0001-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0001-000000000002',
      name: 'Multipurpose Court',
      courtType: 'multipurpose',
      description: 'Basketball (full court) or Pickleball (3 simultaneous slots)',
      isActive: true,
    },
  })

  console.log('✅ Courts created')

  // ── Reservable Units ─────────────────────────────────────────────────────────
  await db.reservableUnit.upsert({
    where: { courtId_unitKey: { courtId: tennis.id, unitKey: 'full' } },
    update: {},
    create: { courtId: tennis.id, unitKey: 'full', label: 'Full Tennis Court', sportType: 'tennis', capacity: 1 },
  })

  await db.reservableUnit.upsert({
    where: { courtId_unitKey: { courtId: multi.id, unitKey: 'basketball_full' } },
    update: {},
    create: { courtId: multi.id, unitKey: 'basketball_full', label: 'Full Court (Basketball)', sportType: 'basketball', capacity: 1 },
  })

  // Pickleball has 3 slots (pb1, pb2, pb3)
  for (const key of ['pb1', 'pb2', 'pb3']) {
    await db.reservableUnit.upsert({
      where: { courtId_unitKey: { courtId: multi.id, unitKey: key } },
      update: {},
      create: {
        courtId: multi.id,
        unitKey: key,
        label: `Pickleball Slot ${key.toUpperCase()}`,
        sportType: 'pickleball',
        capacity: 3,  // stored per-unit; the engine checks total bookings against this
      },
    })
  }

  console.log('✅ Reservable units created')

  // ── Booking Settings ─────────────────────────────────────────────────────────
  await db.bookingSettings.upsert({
    where: { courtId: tennis.id },
    update: {},
    create: {
      courtId: tennis.id,
      slotDurationMinutes: 60,
      openTimeStart: '06:00',
      openTimeEnd: '18:00',       // Tennis: 6am–6pm
      maxAdvanceBookingDays: 7,
      maxSessionHours: 2,
      maxWeeklyHours: 6,
      maxMonthlyHours: 20,
    },
  })

  await db.bookingSettings.upsert({
    where: { courtId: multi.id },
    update: {},
    create: {
      courtId: multi.id,
      slotDurationMinutes: 60,
      openTimeStart: '06:00',
      openTimeEnd: '22:00',       // Multipurpose: 6am–10pm
      maxAdvanceBookingDays: 7,
      maxSessionHours: 2,
      maxWeeklyHours: 8,
      maxMonthlyHours: 24,
    },
  })

  console.log('✅ Booking settings created')

  // ── Admin User ───────────────────────────────────────────────────────────────
  const adminEmail = 'admin@richgate.local'
  const existing = await db.profile.findUnique({ where: { email: adminEmail } })

  if (!existing) {
    const passwordHash = await bcrypt.hash('Admin1234!', 12)
    await db.profile.create({
      data: {
        email: adminEmail,
        passwordHash,
        fullName: 'Admin',
        role: 'admin',
        status: 'active',
        memberId: 'RG-000001',
      },
    })
    console.log('✅ Admin user created: admin@richgate.local / Admin1234!')
  } else {
    console.log('⏭  Admin user already exists')
  }

  // ── Demo member ──────────────────────────────────────────────────────────────
  const memberEmail = 'member@richgate.local'
  const existingMember = await db.profile.findUnique({ where: { email: memberEmail } })

  if (!existingMember) {
    const passwordHash = await bcrypt.hash('Member1234!', 12)
    await db.profile.create({
      data: {
        email: memberEmail,
        passwordHash,
        fullName: 'Jane Smith',
        role: 'member',
        status: 'active',
        memberId: 'RG-000002',
      },
    })
    console.log('✅ Demo member created: member@richgate.local / Member1234!')
  } else {
    console.log('⏭  Demo member already exists')
  }

  console.log('\n🏁 Seed complete.\n')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
