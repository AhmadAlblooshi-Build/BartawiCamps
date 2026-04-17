# Bartawi Camp Management — Deployment Guide

## Installation

From `/client` directory:

```bash
pnpm install next@15 react@19 react-dom@19 typescript@5.4 \
  @tanstack/react-query@5 @tanstack/react-query-devtools@5 \
  zustand@4 \
  react-hook-form@7 @hookform/resolvers@3 zod@3 \
  motion@11 \
  @phosphor-icons/react@2 \
  @radix-ui/react-dialog@1 @radix-ui/react-dropdown-menu@2 \
  @radix-ui/react-tabs@1 @radix-ui/react-popover@1 \
  @radix-ui/react-tooltip@1 @radix-ui/react-switch@1 \
  @radix-ui/react-checkbox@1 @radix-ui/react-slot@1 \
  recharts@2 \
  jspdf@2 \
  sonner@1 \
  date-fns@3 \
  clsx@2 \
  tailwind-merge@2

pnpm install -D tailwindcss@4 postcss@8 autoprefixer@10 \
  @tailwindcss/postcss@4 \
  eslint@9 eslint-config-next@15 \
  @types/react@19 @types/react-dom@19 @types/node@20
```

## Deployment Order

### Step 1: Backend deploys (in this exact order)

1. Apply migrations 002 through 013 (from BACKEND_AUDIT doc)
2. Apply migrations 014 through 020 (from BACKEND_ADDITIONS doc)
3. Run seed scripts for property_types + default teams + roles
4. Restart the Node API
5. Smoke test: GET /api/v1/camps should return 2 camps with auth header

### Step 2: Frontend deploys

1. `pnpm build` — must succeed with zero type errors
2. Set `NEXT_PUBLIC_API_URL` to backend URL in production env
3. Deploy to Vercel/Netlify/self-hosted
4. Smoke test: load /login, successful login, dashboard renders

### Step 3: Live cutover

1. Verify CEO and staff accounts are seeded and can log in
2. Run Camp 1 data migration (monthly_records → current_occupancy)
3. Verify rent roll and outstanding numbers match the client's Excel
4. Go live

## Post-Deploy Verification Checklist

### Core Navigation & Auth
- [ ] Login with test user · dashboard loads with real numbers
- [ ] Camps page shows 2 cards · C1 and C2 · with correct room counts

### Maps & Visualization
- [ ] Camp 1 → Map tab · all 6 blocks A–F render with correct room grid
- [ ] Camp 1 → Map · block E shows mosque marker
- [ ] Camp 2 → Map · fallback block-grid renders (or floor plan if fp_x/fp_y is populated)

### Rooms & Occupancy
- [ ] Room click → drawer opens with tenant + balance + 6-month history
- [ ] Vacant room → Check in → 6-step wizard completes end-to-end
- [ ] Occupied room → Give notice → room status flips to Vacating
- [ ] Vacating room → Complete checkout → balance guard blocks if unpaid

### Contracts
- [ ] Contracts page filters apply · expired, legal, active
- [ ] Contract → Renew → creates contract_renewals row + notification
- [ ] Contract → Flag legal → status flips, visible on map
- [ ] Contract → Notes → create note, reload, note persists

### Notifications
- [ ] Notifications bell · unread count accurate · Ack works · Snooze hides for N days

### Operations
- [ ] Complaints → intake modal → AI auto-classifies after 800ms
- [ ] Maintenance → intake → category picks default team, team lead notified
- [ ] Payments → log cash payment → receipt PDF downloads with Bartawi letterhead

### Reports
- [ ] Reports → Rent roll PDF matches actual data for chosen month
- [ ] Reports → Outstanding PDF total matches dashboard card

### Admin
- [ ] Admin → Property types · create/edit/delete works, rooms update
- [ ] Admin → Users · invite sends, permissions picker saves
- [ ] Admin → Teams · add member, flag as lead, remove member
- [ ] Admin → Settings → feature flags toggle and persist

### Backend Features
- [ ] Dashboard → AI narrator fires with real baseline comparison
- [ ] Cron jobs · overdue detection ran at 01:00 Dubai · payment schedule generated
- [ ] Audit log · every mutation leaves a row with actor + before/after

## Known Issues & Future Work

### Known issues on day 1

- **Camp 2 floor plan**: Block-grid fallback until admin uploads the floorplan image and sets fp_x/fp_y on rooms (interactive pin-drop tool — Sprint 2)
- **Personal tenant data**: 0% populated for Camp 1 (must be backfilled from Minutes of Meeting docs by staff over next 30 days)
- **Yearly contracts**: 6 Camp 1 yearly contracts have no confirmed expiry dates (mig 012 needs Ahmad to supply the real dates — tracked as CEO decision item)
- **Proration policy**: Needs CEO sign-off (currently: full-month billing on mid-month check-in) — can be toggled via migration 015a once policy is decided

### Sprint 2 roadmap

- Interactive floor plan editor for Camp 2 (drag-and-drop rooms onto uploaded image)
- Bulk rent increase tool (apply % or fixed AED uplift to multiple contracts)
- Cheque bounce handling (flag cheque payment as bounced, re-open balance)
- Monthly recurring exports (cron job emails PDFs to CEO on 1st of each month)
- Tenant-facing portal (read-only access for tenants to view their own balance)
- Advanced analytics dashboard (cohort retention, seasonality, churn prediction)
- Integration with accounting software (Zoho Books, Xero, or QuickBooks)

### Sprint 3 roadmap (shared with other Bartawi products)

- Extract design system to @bartawi/design-system npm package
- Extract auth to shared Clerk or standalone SSO service
- Mother product API contract — when CEO defines use cases
- Mobile app (React Native) — Intelligence chat, escalations, push notifications

## Architecture Notes

### Design System: "Desert Software"

Bloomberg terminal meets Stripe with Gulf regional soul:
- Warm off-white canvas
- Espresso text
- Desaturated amber accent
- Fraunces variable serif for display (italics reserved for expressive moments)
- Geist for body
- JetBrains Mono for numbers and data

### Signature Features

The features that separate this from generic admin software:
1. **AI Anomaly Narrator** on the dashboard
2. **Physical Map View** of both camps with accurate floorplans

Treat these with the craft they deserve.

### Tech Stack

- **Framework**: Next.js 15 (App Router) + React 19
- **Styling**: Tailwind CSS v4 with @theme directive
- **State**: TanStack Query v5 + Zustand
- **Animations**: Motion (Framer Motion v12) with spring physics
- **UI Primitives**: Radix UI
- **Icons**: Phosphor Icons (LIGHT weight only)
- **PDF Generation**: jsPDF
- **Charts**: Recharts

### Key Constraints

- Tailwind v4 only — design tokens in globals.css @theme block
- Phosphor Icons LIGHT weight only
- ES modules throughout
- ESLint set to warn (ignoreDuringBuilds: true)
- No infinite animations except ONE live-pulse dot on status indicators
