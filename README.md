# Rent Flow — Fix: prorated math for recurring expenses

Two stacked bugs made your salary appear as **1,067** instead of **1,000**. Both fixed here.

## Bug 1 (immediate): +1 off-by-two

My periodDays calculation had a stray `+ 1`:

```js
const periodDays = Math.max(1, Math.ceil((periodEnd - periodStart) / 86400000) + 1);
```

For July (31 days), this returned 32. Then `1000 × 32 / 30 = 1066.67`. The extra 67 SAR you saw.

## Bug 2 (deeper): days-based proration doesn't fit calendar months

Even with the `+ 1` removed, `amount × days / 30` would give:
- July (31 days): 1000 × 31/30 = **1,033**
- February (28 days): 1000 × 28/30 = **933**
- Average across a year is 1000, but individual months look wrong

Analytics.js had the same subtle over-count for yearly recurring (12,167 for a full year of a 1000/month rule, instead of exactly 12,000).

## The fix

**Recurring rules count by calendar unit, not days.**

- Monthly rule: contributes `amount` per calendar month it's active in
- Yearly rule: contributes `amount / 12` per calendar month it's active in
- One-time: contributes `amount` if its date is in the period, else 0

Verified with a sanity test:
```
Monthly 1000 (started Jul 23), July filter:  1,000  ✓
Monthly 1000, Q3 filter:                     3,000  ✓
Monthly 1000, 2026 filter:                   6,000  ✓  (Jul-Dec = 6 months)
Monthly 1000, Feb (before rule started):         0  ✓
Yearly 12000, July filter:                   1,000  ✓
Yearly 12000, 2026 filter:                  12,000  ✓
One-time 500 (Jul 15), July filter:            500  ✓
One-time 500 (Jul 15), Q2 filter:                0  ✓
```

## Why calendar units, not days

A monthly rent of 1000 SAR is a *fact*, not an average. It doesn't become 1033 in July because July has 31 days. It's 1000 in every month it applies.

Days-based proration only makes sense for partial-month calculations (e.g. "rent from July 15 to Aug 20"). Rent Flow's filters are all whole calendar units — this month, this quarter, this year, all time. Calendar counting is the natural fit.

## Where the fix applies

Same math in both places, so numbers agree everywhere:

**`src/lib/expenseUtils.js`** — the frontend helper used by Expenses tab:
- `contributionInPeriod(expense, start, end)` — rewritten to use `calendarMonthsInRange` for monthly, `amount / 12 × months` for yearly

**`api/analytics.js`** — the backend used by Analytics:
- New `expenseContributionInPeriod` helper at module scope (mirrors expenseUtils)
- Main expense-table sum uses it
- Per-unit P&L global share uses it
- Per-unit P&L direct expenses use it
- Breakdown handler uses it
- Trend distribution now computes per-month contribution instead of dividing period total by month count

## Files touched (2)

- `src/lib/expenseUtils.js`
- `api/analytics.js`

No schema changes. No API contract changes.

## Install

```bash
unzip -o rentflow-expenses-phase2d.zip -d .
cp -r patch/api  ./
cp -r patch/src  ./
rm -rf patch rentflow-expenses-phase2d.zip

git add -A
git commit -m "expenses phase 2d: calendar-month proration for recurring expenses"
git push origin design-md-changes
```

## After deploy — what to verify

1. **Your 1,000 SAR salary** should now show **1,000** in the "هذا الشهر" hero. Not 1,067, not 1,033.
2. **Category card** for رواتب وموظفين should also show 1,000
3. **List total** in the ledger toolbar should show 1,000
4. **Analytics totalExpenses** should agree with the Expenses hero
5. **Try switching filters** — "الربع الحالي" should show 3× the monthly amount, "هذه السنة" should show N× the monthly amount where N = months from rule start to end of year

## Retro on process

I should have run these sanity tests before shipping Phase 2c. The formula came from analytics.js which had the same subtle bug, so "matching analytics" only meant "same wrong number". A basic test — "1000/month rent should show 1000 in July" — would have caught it immediately.

For future patches involving arithmetic on user data, I'll write a quick verification script before packaging. Prevents these round-trips.
