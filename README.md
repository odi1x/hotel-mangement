# Rent Flow — Batch Hotfix

Six real bugs, one dead file, all in one patch.

## 1. Apartment PUT 500 error — FIXED

**Root cause:** `api/apartments.js` was still trying to write `rentCost`, `rentPeriod`, `cleaningType`, `cleaningCost`, `otherExpenseLabel`, `otherExpenseAmount` — all of which Phase 2b dropped from the schema. Prisma threw on every PUT and POST.

**Fix:** rewrote apartments.js to only reference current schema fields (`cleaningFeePerStay`, `platformFee/Type`, standard fields). Any legacy field a client still sends is silently ignored rather than blowing up.

## 2. Desktop notification button broken — FIXED

**Root cause:** the dropdown panel was portaled to `<body>` but used `md:absolute md:top-full md:left-0`. Absolute positioning needs a positioned ancestor — with portal → body, there isn't one, so the panel rendered at viewport (0,0), hidden under the header. Same `dropdownRef` was mis-attached to both the button wrapper AND the portaled panel, so click-outside detection also broke.

**Fix:** separated the refs (`buttonRef` for the bell, `dropdownRef` for the panel). On open, measure the button's `getBoundingClientRect()` and use it to position the panel as `fixed` on desktop, anchored below-right of the button. Mobile keeps its viewport-anchored fixed layout. Click-outside now checks both refs.

## 3. Analytics "filter active" indicator on load — FIXED

**Root cause:** `hasActiveFilters = ... || (analyticsFilter.startDate && analyticsFilter.endDate)`. Since the yearly period chip sets `startDate/endDate` on mount, this was always true — the `•` dot and X button appeared before the user did anything.

**Fix:** `hasActiveFilters` now excludes dates that match the current chip's range. Only apartment picks OR a custom range that doesn't match any chip counts as "advanced." Loading Analytics fresh no longer shows the active-filter indicator.

## 4. Expenses tab: hero total + list behavior — FIXED

**Two issues:**

**A) Hero always showed "this month" regardless of the selected chip.** Switching to quarter/year/all left the hero on stale numbers.

**B) Recurring rules were hidden from the list when the current filter's window ended before the rule's start date** (e.g. a future-dated rule was invisible in month/quarter/year views). User expectation: recurring rules represent ongoing obligations and should always be visible in the ledger.

**Fix:**
- Added `heroSummary` — driven by `timeFilter`. Label, amount, and comparison all reflect the current chip:
  - `month`: this month vs last month
  - `quarter`: this quarter vs last quarter
  - `year`: this year vs last year
  - `all`: lifetime total, no comparison
- List filter: recurring rules are always visible. Only hidden if the rule has been explicitly ended (`recurringUntil` set) BEFORE the current period starts.

## 5. Payment double-submission guard — HARDENED

**Existing:** `setSubmitting(true)` + `disabled={submitting}` on the button. Good, but React state updates are batched — between the click event and `disabled` applying, a very fast second click (or an Enter key repeat) can enter the handler again.

**Fix:** added a `useRef`-based synchronous lock. `submittingRef.current = true` runs immediately, closes the window that the state update leaves open.

This prevents FUTURE duplicate payments. If you already have historical duplicates in the DB inflating totals (see #6), this doesn't retroactively clean them.

## 6. إجمالي المحصَّل 39,300 vs revenue 10,540 — DIAGNOSTIC PROVIDED

The 4× inflation looks like existing duplicate `Payment` rows. To find them, run this in the Neon SQL editor once you have console access again:

```sql
-- Bookings where total payments exceed the booking's price by 50%+
SELECT
  b.id,
  b."residentName",
  b."totalPrice",
  COUNT(p.id)      AS payment_count,
  SUM(p.amount)    AS total_paid,
  SUM(p.amount) - b."totalPrice" AS overpayment
FROM "Booking" b
LEFT JOIN "Payment" p ON p."bookingId" = b.id
GROUP BY b.id
HAVING SUM(p.amount) > b."totalPrice" * 1.5
ORDER BY overpayment DESC;
```

For each row that comes back, look at the payment details:

```sql
-- Replace 'BOOKING_ID' with the id from above
SELECT id, amount, date, method, type, "createdAt", "collectedBy"
FROM "Payment"
WHERE "bookingId" = 'BOOKING_ID'
ORDER BY "createdAt" ASC;
```

Look for near-identical rows created within seconds of each other — those are the duplicates. Delete via the UI (Payment Ledger modal → trash icon on each row) or via SQL if you're comfortable.

## 7. Dead API file removed

`api/staff-expenses.js` was still querying `prisma.staffExpense.findMany` — but Phase 2b dropped that model. Any request would 500. Removed the file entirely.

## About the "showing 0 in all tabs" report

Your recurring salary rule was dated **October 3, 2026**. Whether it counts toward this month/quarter/year depends on whether "today" is before or after October 3.

- If **today < Oct 3**: the rule hasn't started yet. Contribution is correctly 0 for month/quarter/year filters. `الكل` (all) will show the rule in the list, but its contribution to totals is still 0 until it starts.
- If **today >= Oct 3**: the rule is active. Month filter should show 1000. Longer filters show `months_active × 1000`.

After this patch:
- The rule is always visible in the list on every tab (was hidden from month/quarter before if the rule's start date was after the period end)
- The hero total updates when you switch tabs (was frozen on "this month" before)
- If you're still seeing 0 in a tab where you expect a value, first check whether today's date has actually passed the rule's start date

## Files touched (6)

- `api/apartments.js` — rewrite to Phase 2b schema
- `api/staff-expenses.js` — **deleted**
- `src/components/layout/NotificationsDropdown.jsx` — portal position fix
- `src/components/views/AnalyticsView.jsx` — `hasActiveFilters` refinement
- `src/components/views/ExpensesView.jsx` — dynamic hero + always-show recurring
- `src/components/ui/PaymentLedgerModal.jsx` — sync double-submit guard

## Install

```bash
unzip -o rentflow-batch-hotfix.zip -d .
cp -rn patch/. .
# Note the . at the end — merges into current directory
# staff-expenses.js won't be recreated (patch has no copy of it) but you
# should also delete it from your local checkout since it's dead:
rm -f api/staff-expenses.js
rm -rf patch rentflow-batch-hotfix.zip

git add -A
git commit -m "batch hotfix: apartments PUT, notifications desktop, filter indicator, expenses hero, payment guard, dead staff-expenses"
git push origin main
```

Or if you prefer, unzip into a scratch folder and manually copy files over.

## After deploy — what to verify

1. **Edit an apartment** — should save without 500. Check devtools Network tab: PUT /api/apartments returns 200.
2. **Click the bell icon on desktop** — dropdown should appear anchored below the bell, not at (0,0) or hidden.
3. **Load Analytics fresh** — no `•` dot on تصفية, no X clear button. Only appears if you actually pick apartments in the modal or set a custom date range.
4. **In Expenses, click through the period chips** — the hero label and amount update accordingly. Recurring rules stay in the list on every tab.
5. **Fast-click the payment submit button** — only one payment gets recorded.
6. **Run the SQL diagnostic** (once console access is back) to find and remove historical duplicate payments.

## What's not in this patch

- **Compute burn reduction** (analytics caching, mount-fetch trimming) — separate patch, no urgency now that the app is working.
- **Automatic backup script** — Vercel Cron + R2/S3. Real insurance for the next Neon quota crisis. Worth a dedicated patch.
- **Recurring cron generation** — turning virtual proration into concrete monthly ledger rows. Still Phase 3 material.

Say when you want to tackle any of those.
