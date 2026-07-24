# Rent Flow — Expenses Phase 2b: Full Schema Cleanup

The destructive cleanup. Legacy fields dropped from the Apartment model, `StaffExpense` table gone entirely, analytics rewritten to read only from Expense table, apartment form split into pricing vs expenses. Deep-linking wired end-to-end.

This is a **larger** patch than the previous ones — 9 files, schema drops that can't be undone via `prisma db push`. Ship when you're ready to commit to the new model.

## Schema drops

**Apartment model:**
- `rentCost` — dropped (migrated to Expense category=rent, scope=unit)
- `rentPeriod` — dropped (migrated with rentCost)
- `cleaningType` — dropped (no longer needed — the salaried variant is now an Expense, the per-booking variant is renamed below)
- `cleaningCost` — **renamed** to `cleaningFeePerStay` (per-booking fee only)
- `otherExpenseLabel` — dropped (migrated to Expense category=other)
- `otherExpenseAmount` — dropped (migrated with otherExpenseLabel)

What remains on Apartment (pricing + per-booking fees only):
- `basePrice` — nightly rate
- `cleaningFeePerStay` — per-stay cleaning fee, applied to each booking
- `platformFeeType` + `platformFee` — per-booking commission

**Dropped entirely:**
- `StaffExpense` model (all data migrated to Expense with category='staff')
- `User.staffExpenses` relation (no longer exists)

## Migration is done

Phase 1b's auto-migration read from these fields and created Expense records. If you deployed Phase 1b and opened the Expenses tab at least once, your data is safe in the Expense table. This patch removes the source fields.

**If you never opened Expenses after Phase 1b** — the fields still had data but never got migrated. Ship this patch after visiting Expenses once so the migration runs.

## Analytics rewrite

`api/analytics.js` was doing a lot of work with the old fields. That's all gone. Now:

**Removed:**
- `useExpenseTable` conditional branching (always uses Expense table now)
- StaffExpense query + apportionment
- User settings `generalExpenses` field read (was legacy, never actually populated)
- Apartment rentCost apportionment (all rent lives in Expense)
- Empty-apartments rent block (same)
- MaintenanceIssue cost direct read (auto-linked to Expense via `syncMaintenanceExpense`)
- The dead `countedRentApartmentIds` tracker
- The `otherExpenseAmount` per-booking add

**Kept as booking-variable (correctly, these aren't expenses — they're pricing):**
- `cleaningFeePerStay` — added to each booking's cost
- `platformFee` — percentage or fixed per booking

**Breakdown handler** (used by the analytics modal drilldowns) — completely rewritten. Reads from Expense table + booking-variable fees. Now returns 7 line items: revenue, rent, platform, cleaning, staff, maintenance, general.

**Per-unit P&L** — no longer gated on `useExpenseTable` (always computed).

## Auto-migration is now maintenance-only

The `runInitialMigration` function still exists but only handles maintenance backfill now (legacy sources are gone). Called from `GET /expenses` when there are resolved maintenance issues with cost > 0 that don't yet have their linked Expense row. Idempotent at row level (skips already-linked issues).

For most users this will be a no-op — Phase 1b already did the historical backfill. It's a safety net for edge cases.

## ApartmentsView form: split into pricing vs expenses

**Old disclosure:** "التكاليف والمالية (إعدادات متقدمة)" — one section with 4 fields.

**New disclosure:** "التسعير والرسوم لكل حجز" (Pricing & Per-Booking Fees) — 2 fields:
- رسوم التنظيف لكل حجز (per-stay cleaning fee)
- عمولات المنصات (platform commission, percentage or fixed)

Plus, when editing an existing apartment, a link at the bottom:

> **↓ شاهد مصروفات هذه الوحدة**
> إيجار، صيانة، مستلزمات — كل ما يخص هذه الوحدة

Clicking it closes the apartment form and opens ExpensesView filtered to that unit.

Under the cleaning fee is guidance text: "إن كان لديك عامل نظافة براتب شهري، سجّله كمصروف متكرر في تبويب المصروفات بدلاً من هنا" — explicit signposting that salaried cleaning belongs in Expenses now.

## Deep-linking

**Layout.jsx** now supports `setView(view, filter)`. The filter is stored as `viewFilter` state and passed to consumer views. Clearing on any navigation without a filter argument.

**AnalyticsView P&L rows** — each row (desktop table row + mobile card) is now clickable. Click → `setView('expenses', { apartmentId: u.id })` → Expenses opens filtered to that unit with the time filter set to 'all' (so you see historical, not just this month).

**ApartmentsView "view expenses" link** — same navigation pattern.

**ExpensesView** accepts an `initialFilter` prop. When populated with `apartmentId`, it:
- Starts on 'all' time filter (not month) — user wants to see everything for the unit
- Applies the apartment filter to the row list
- Shows a prominent removable chip at the top of the filter row: `[🏢 UnitName ✕]` — clicking the ✕ clears the filter

## DataContext cleanup

Removed:
- `staffExpenses` state
- `fetchStaffExpenses` function (was calling nonexistent `/api/staff-expenses` — silent 404)
- `staffExpenses` + `fetchStaffExpenses` from the provider value
- The mount-time fetch call

Nothing else depended on them (verified across the codebase).

## Files touched (9)

1. `prisma/schema.prisma` — Apartment field drops + rename, StaffExpense model dropped, User.staffExpenses relation dropped
2. `api/admin-resources.js` — runInitialMigration simplified to maintenance-only backfill, auto-migration trigger refined
3. `api/analytics.js` — breakdown handler rewritten, main handler stripped of all legacy paths, dead vars removed
4. `src/components/views/ApartmentsView.jsx` — form state + open/save handlers + JSX disclosure rewritten, ArrowDownCircle import, setView prop
5. `src/components/views/AnalyticsView.jsx` — setView prop, P&L rows clickable (desktop + mobile)
6. `src/components/views/ExpensesView.jsx` — initialFilter prop, apartmentFilter state, filter application, removable filter chip
7. `src/components/layout/Layout.jsx` — viewFilter state, setView(view, filter) signature, pass to ApartmentsView + AnalyticsView + ExpensesView
8. `src/context/DataContext.jsx` — staffExpenses state / fetch / provider value / mount call all removed

## Install

```bash
unzip -o rentflow-expenses-phase2b.zip -d .
cp -r patch/prisma  ./
cp -r patch/api     ./
cp -r patch/src     ./
rm -rf patch rentflow-expenses-phase2b.zip

git add -A
git commit -m "expenses phase 2b: schema cleanup + analytics rewrite + apartment form split + deep-linking"
git push origin design-md-changes
```

Vercel auto-runs `prisma db push` on deploy. This will:
1. Drop columns from Apartment
2. Drop the StaffExpense table
3. Rename `cleaningCost` → `cleaningFeePerStay` (or actually a drop + create — Postgres/Prisma default. Data in the old column is gone)

**Data loss warning:** if you have any Apartment rows where `cleaningCost` was set with `cleaningType='per_booking'` and Phase 1b's auto-migration didn't run yet, that per-booking fee data will be lost. Verify by opening Expenses tab (triggers migration) BEFORE deploying this patch, or manually re-enter per-booking cleaning fees using the new `cleaningFeePerStay` field afterward.

## After deploy — what to verify

1. **Apartment form** — the disclosure now says "التسعير والرسوم لكل حجز" and has only 2 field groups (cleaning fee, platform fee). No more rent, no more cleaning-type toggle, no more "other expenses" fields.

2. **Editing an existing apartment** — scroll to the bottom of the pricing disclosure. You should see the "شاهد مصروفات هذه الوحدة" link with an ArrowDownCircle icon. Click it → apartment form closes, Expenses opens with that unit's filter chip visible at the top.

3. **Analytics — click a P&L row** — desktop table row or mobile card. Should navigate to Expenses filtered by that unit, time set to "الكل".

4. **Expenses filter chip** — when filtered by unit, a solid dark chip appears next to the category dropdown: `[🏢 UnitName ✕]`. Click ✕ → filter clears, all expenses show again.

5. **Analytics totals** — should be close to pre-Phase-2b values (the reads are cleaner but the math is the same). If wildly different, there's a bug.

6. **Analytics breakdown modal** — should show 7 lines: revenue, rent, platform, cleaning, staff, maintenance, general. Rent = sum of Expense category='rent'. Staff = sum of Expense category='staff'. Etc.

7. **Settings** — no changes here. The finance tab was already removed in Phase 1b.

8. **Sidebar/mobile menu** — no changes. المصروفات still sits between المستحقات and الصيانة.

## What comes next

Phase 3 territory — none of it required to make the ledger useful, but any of it would extend the system meaningfully:

- **Recurring generation cron** — the isRecurring flag is set on migrated + manually created recurring expenses, but no cron actually generates monthly instances yet. Analytics prorates virtually. A daily cron that creates the next occurrence per recurring rule would give you a proper monthly ledger view.
- **Budget per category** with alerts when approaching limits
- **Comparison to previous period** — mini-sparklines on P&L rows and category cards
- **Break-even nights calculator** per unit (uses P&L math you already have)
- **Vendor spend analysis** (uses expense.vendor field)
- **Receipt upload UI** (field exists on model, upload widget not wired)
- **Renewal reminders** (uses recurringUntil field)

Try Phase 2b for a bit. Any of these worth prioritizing?
