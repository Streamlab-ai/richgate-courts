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

  console.log('✅ Courts')

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

  for (const key of ['pb1', 'pb2', 'pb3']) {
    await db.reservableUnit.upsert({
      where: { courtId_unitKey: { courtId: multi.id, unitKey: key } },
      update: {},
      create: {
        courtId: multi.id,
        unitKey: key,
        label: `Pickleball Slot ${key.toUpperCase()}`,
        sportType: 'pickleball',
        capacity: 3,
      },
    })
  }

  console.log('✅ Reservable units')

  // ── Booking Settings ─────────────────────────────────────────────────────────
  await db.bookingSettings.upsert({
    where: { courtId: tennis.id },
    update: {},
    create: {
      courtId: tennis.id,
      slotDurationMinutes: 60,
      openTimeStart: '06:00',
      openTimeEnd: '18:00',
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
      openTimeEnd: '22:00',
      maxAdvanceBookingDays: 7,
      maxSessionHours: 2,
      maxWeeklyHours: 8,
      maxMonthlyHours: 24,
    },
  })

  console.log('✅ Booking settings')

  // ── App Settings (pricing + monetization) ────────────────────────────────────
  // Always upsert — ensures defaults exist and never overwrite admin changes.
  const appSettingDefaults = [
    { key: 'monetization_enabled',      value: 'false', label: 'Monetization (charge non-members)' },
    { key: 'price_per_hour_tennis',     value: '200',   label: 'Tennis — Price per Hour (₱)' },
    { key: 'price_per_hour_pickleball', value: '200',   label: 'Pickleball — Price per Hour (₱)' },
    { key: 'price_per_hour_basketball', value: '400',   label: 'Basketball — Price per Hour (₱)' },
    { key: 'price_per_day_bptl_tennis', value: '100',   label: 'BPTL Tennis — Daily Access Rate (₱)' },
  ]

  for (const s of appSettingDefaults) {
    await db.appSetting.upsert({
      where:  { key: s.key },
      update: {},            // never overwrite existing — admin may have changed them
      create: s,
    })
  }

  console.log('✅ App settings')

  // ── Super Admin (always upsert — ensures memberId = RG-000001) ───────────────
  // This is critical: isSuperAdmin checks memberId === 'RG-000001'.
  // If the account was created before memberId was set, this corrects it.
  const adminEmail = 'admin@richgate.local'
  const existingAdmin = await db.profile.findUnique({ where: { email: adminEmail } })

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('Admin1234!', 12)
    await db.profile.create({
      data: {
        email: adminEmail,
        passwordHash,
        fullName: 'Super Admin',
        role: 'admin',
        status: 'active',
        memberId: 'RG-000001',
      },
    })
    console.log('✅ Super admin created — admin@richgate.local / Admin1234!')
  } else if (existingAdmin.memberId !== 'RG-000001') {
    // Fix missing or wrong memberId — this is what makes isSuperAdmin work
    await db.profile.update({
      where: { email: adminEmail },
      data:  { memberId: 'RG-000001' },
    })
    console.log(`✅ Super admin memberId fixed: ${existingAdmin.memberId ?? 'null'} → RG-000001`)
  } else {
    console.log('⏭  Super admin already correct')
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
    console.log('✅ Demo member created — member@richgate.local / Member1234!')
  } else {
    console.log('⏭  Demo member already exists')
  }

  console.log('\n🏁 Seed complete.\n')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
