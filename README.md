# Rent Flow — Receptionist Permission (canViewPrices)

Follow-up to the staff-permissions patch. Adds a `canViewPrices` toggle for the "front-desk / receptionist" role: staff who need to see who's checking in and who's currently staying, but shouldn't see the money.

## What this enables

Turn off `canViewPrices` for a staff member and:
- **Availability view**: booking cells stop showing the nightly-rate badge. Tooltips drop the price line. The details panel that opens when clicking a booking hides the "السعر لليلة" card.
- **Residents list**: the price line (`{X} ر.س / ليلة`) below each unit name disappears. Only the unit name shows.

Everything else in those views works exactly as before — guest names, check-in/out dates, unit assignments, phones, IDs, nights count. The receptionist can do their job.

## What still shows financials (correctly)

- **Balances page** — already gated by `canViewBalances`. If the staff has that off, the whole tab is hidden.
- **Analytics** — gated by `canViewAnalytics`.
- **Booking form** — creating/editing bookings is gated by `canBook`/`canEdit`. If a receptionist somehow has one of those, they'd see the price fields as inputs anyway (they'd be entering them). But typically a receptionist role would have canBook=false as well.

The gating is layered — this new one just closes the specific gap where a staff with tab access could still see prices in read-only booking displays.

## Files changed

- `prisma/schema.prisma` — `canViewPrices Boolean @default(true)`
- `api/auth.js` — 4 permissions blocks updated
- `api/staff.js` — GET/POST/PUT accept and return the new field
- `src/components/ui/StaffFormModal.jsx` — new toggle: "عرض الأسعار" with a clear description explaining the receptionist use case
- `src/components/views/ResidentsView.jsx` — 1 site: nightly price line in unit column
- `src/components/views/AvailabilityView.jsx` — 3 sites: booking-cell badge, tooltip, details panel

## Default behavior

- **Schema default: `true`** — every existing staff member automatically gets access to prices (no behavior change on deploy).
- **New staff default: `true`** — matches expectation; only turn it off when creating a restricted role.

## Install

```bash
unzip -o rentflow-can-view-prices.zip -d .
cp -r patch/api    ./
cp -r patch/prisma ./
cp -r patch/src    ./
rm -rf patch rentflow-can-view-prices.zip

git add -A
git commit -m "feat: canViewPrices permission — hide prices in bookings/residents for receptionist role"
git push origin design-md-changes
```

Vercel will run `prisma db push` and add the new column with `@default(true)` — no data migration issue.

## Verify after deploy

1. Open Settings → Staff. Edit an existing staff member. There should be a new toggle "**عرض الأسعار**" above the "**إدارة المستحقات**" toggle. It should be ON by default.
2. Create a test staff member: give them `canBook: false`, `canEdit: false`, `canViewBalances: false`, `canViewPrices: false`, everything else off except `canViewMaintenance` if relevant. This is the "receptionist" configuration.
3. Log in as that staff. Open the availability view — booking cells should not show a "500 ر.س" badge, just the unit color + guest name. Click any booking — details panel should not show "السعر لليلة".
4. Open سجل النزلاء — each row's "الوحدة" column should show only the unit name, no "500 ر.س / ليلة" line below it.
5. Turn `canViewPrices` back on for that staff member. Refresh their browser. Prices should reappear everywhere.

## What I did NOT gate

- **BookingForm inputs** — if a staff has `canBook` or `canEdit`, they'd be creating/editing prices themselves. Read-only display gating doesn't apply to input fields.
- **PaymentLedgerModal** — only accessible via BalancesView, which is already gated.
- **PrintAgreement** — printed contract inherently needs the total price. Only accessible from ResidentsView actions gated by `canEdit`.

If any of these surface a problem in practice, tell me and I'll add gates.
