# Club Courts Reservation System

A production-ready, mobile-first court booking webapp — built locally with no external services.

---

## Stack

| Layer     | Technology |
|-----------|------------|
| Framework | Next.js 16.2 — App Router, Turbopack |
| Language  | TypeScript (strict) |
| Database  | SQLite via Prisma 5 ORM |
| Auth      | JWT (jose) + bcryptjs, HTTP-only cookie |
| Styling   | Tailwind CSS 4 — Apple-inspired, mobile-first |
| Tests     | Jest + ts-jest — 73 tests |

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Create your local DB and seed it
DATABASE_URL="file:./dev.db" npx prisma db push
DATABASE_URL="file:./dev.db" npx prisma db seed

# 3. Start the dev server
npm run dev
```

Open **http://localhost:3000**

### Default accounts

| Role         | Email                        | Password      |
|--------------|------------------------------|---------------|
| Super Admin  | superadmin@richgate.local    | Admin1234!    |
| Admin        | admin-demo@richgate.local    | admin1234     |
| HOA Member   | member@richgate.local        | Member1234!   |
| BPTL Member  | bptl-demo@richgate.local     | bptl1234      |
| Guard        | guard@richgate.local         | guard1234     |

---

## Courts & Rules

### Tennis Court
- Exclusive booking — 1 booking per timeslot
- Open: 06:00–18:00 daily
- Sport: Tennis only

### Multipurpose Court
- **Basketball** — uses entire court, exclusive per slot
- **Pickleball** — 3 simultaneous bookings allowed (PB1/PB2/PB3)
- Basketball and Pickleball **cannot overlap** in the same time slot
- Open: 06:00–22:00 daily

---

## Features

### Member Flow
1. Register → submitted for admin approval
2. Admin approves → member ID assigned (RG-XXXXXX)
3. Login → home screen with upcoming bookings
4. Book: choose sport → choose date (up to 7 days ahead) → select multiple slots → confirm
5. My Bookings: see upcoming/past bookings, QR token, cancel
6. Waitlist: join when a slot is full, auto-promoted when slot opens (FIFO)
7. Profile: view member details, sign out

### Admin Flow
1. Dashboard: stats snapshot + upcoming bookings
2. Registrations: approve/reject with optional notes
3. Members: search/filter, activate/suspend/delete
4. Bookings: filter by date/court/status, admin cancel
5. Waitlist: view all active entries
6. Recurring: view all series
7. Check-in: enter QR token to check in a member
8. Reports: utilization, top members, waitlist activity, check-in log (month filter)
9. Settings: view per-court booking rules

---

## Booking Engine

All logic lives in `services/booking/`.

### Conflict Detection (`validate.ts → checkConflict`)
- **Tennis**: any overlap blocks the slot
- **Basketball**: any overlap (including pickleball) blocks the slot
- **Pickleball**: blocked if basketball is overlapping; blocked if 3 pickleball bookings already exist for that slot

### Usage Limits (`validate.ts`)
- **Session**: max hours per single booking session
- **Weekly**: max hours per calendar week (Mon–Sun)
- **Monthly**: max hours per calendar month
- Admins bypass all limits via `adminOverride: true`

### Slot Generation (`generate-slots.ts`)
- Builds a regular grid from `openTimeStart` to `openTimeEnd`
- Checks blackout dates, advance-booking horizon, then per-slot availability
- Returns `available: boolean`, `reason?: string`, `pickleballSlotsLeft?: number`

### Multi-slot Booking (`create-booking-group.ts`)
- Each slot is validated and created independently
- Returns `succeeded[]` + `failed[]` — partial success allowed
- QR token generated for each booking

---

## Waitlist (`services/waitlist/`)
- FIFO queue — `position` field maintained
- On cancellation: `promoteFromWaitlist()` auto-books the first eligible waiting member
- Ineligible members (suspended/deleted) are skipped; queue continues

---

## Recurring Reservations (`services/recurring/`)
- Frequencies: `daily` | `weekly` | `custom` (arbitrary weekdays)
- Each occurrence is validated independently → partial success
- `cancelRecurrenceSeries()` supports `single` / `forward` / `all` scopes

---

## QR Check-in (`services/checkin/`)
- Each confirmed booking gets a 12-char URL-safe QR token
- Check-in window: 15 min before to 30 min after slot start
- Duplicate check prevents double check-in
- Admin can enter token manually on `/checkin` page

---

## Notifications (`services/notifications/`)
- Fully simulated locally — `console.log` + persisted to `notifications_log` table
- Events: `booking_confirmed`, `booking_cancelled`, `waitlist_joined`, `waitlist_promoted`, `recurring_summary`, `member_approved`, `member_rejected`
- Swap internals for Resend/SendGrid when going to production — interface unchanged

---

## Tests

```bash
npm test
```

73 tests across 4 suites:

| Suite | Tests |
|-------|-------|
| `booking-engine.test.ts` | time utilities, conflict detection, sport rules, pickleball capacity, basketball/pickleball mutual exclusion |
| `waitlist.test.ts`       | FIFO queue positioning, re-numbering after removal, promotion eligibility |
| `recurring.test.ts`      | occurrence date generation (daily/weekly/custom), partial success handling |
| `checkin.test.ts`        | time window validation, duplicate prevention, QR token format |

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new member |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET  | `/api/courts` | List active courts |
| GET  | `/api/slots?courtId&sportType&date` | Get available slots |
| GET  | `/api/bookings` | My bookings |
| POST | `/api/bookings` | Create multi-slot booking |
| DELETE | `/api/bookings/[id]` | Cancel booking |
| GET  | `/api/waitlist` | My waitlist entries |
| POST | `/api/waitlist` | Join waitlist |
| DELETE | `/api/waitlist/[id]` | Leave waitlist |
| POST | `/api/checkin` | Process QR check-in |
| GET  | `/api/recurring` | List recurring series |
| POST | `/api/recurring` | Create recurring series |
| GET  | `/api/admin/registrations` | Pending registrations (admin) |
| POST | `/api/admin/registrations` | Approve/reject (admin) |
| GET  | `/api/admin/members` | Member list (admin) |
| PATCH | `/api/admin/members/[id]` | Edit member (admin) |
| DELETE | `/api/admin/members/[id]` | Delete member (admin) |
| GET  | `/api/admin/bookings` | All bookings (admin) |
| POST | `/api/admin/bookings` | Admin booking override |
| GET  | `/api/reports?type&month` | Reports (admin) |

---

## Supabase Migration (future)

When ready to go to production:
1. Keep `services/` layer — just swap `lib/db.ts` for a Supabase Prisma adapter
2. Replace `lib/session.ts` with Supabase Auth
3. Apply `supabase/migrations/` SQL files (already written in `/build/supabase/`)
4. Switch `sendNotification()` to use Resend
5. Add `DATABASE_URL` and Supabase env vars to `.env.local`

The service interfaces (`createBookingGroup`, `promoteFromWaitlist`, etc.) are untouched.

---

## Folder Structure

```
build/
├── app/
│   ├── (public)/login, register
│   ├── (member)/home, reserve, reservations, profile, pending
│   ├── (admin)/dashboard, registrations, members, bookings,
│   │          waitlists, recurring, checkin, reports, settings
│   └── api/  auth, courts, slots, bookings, waitlist, checkin,
│              recurring, admin/*, reports
├── components/ui/  button, card, badge, input
├── lib/            auth.ts, db.ts, session.ts
├── services/
│   ├── booking/    types, time-utils, generate-slots, validate,
│   │               create-booking-group, cancel, nanoid
│   ├── waitlist/   join, leave, promote
│   ├── recurring/  create-series, cancel-series
│   ├── checkin/    generate-token, process-checkin
│   └── notifications/  index (simulated)
├── prisma/         schema.prisma, seed.ts, dev.db
└── __tests__/      booking-engine, waitlist, recurring, checkin
```
