# Rent Flow — Expenses Phase 2c: Recurring records visibility fix

Small, focused patch. Fixes the discrepancy where salaries showed up in Analytics but not in the Expenses tab.

## The bug

Migrated recurring records (salaries, rent, etc.) were dated on the day migration ran — typically weeks or months ago by now. Two components read them differently:

- **Analytics** correctly prorated them across the current period (a monthly salary counts every month, regardless of when the record was created)
- **ExpensesView** filtered them by literal `date` field only — so a July-dated salary record didn't appear under "This Month" in August

Result: Analytics said "you spent X this month", but the Expenses tab list showed a smaller number and no salaries at all.

## The mental model correction

Recurring records aren't ledger events — they're **rules**. A "monthly rent" record represents an ongoing obligation, not a specific payment on a specific day. It applies to every month between its start (`date`) and its optional end (`recurringUntil`).

One-time records still work the old way — filter them by date, they represent single events.

## What this patch does

1. **New helper `contributionInPeriod(expense, start, end)` in `expenseUtils.js`** — computes how much a single expense contributes to a given period. Same math as `analytics.js`:
   - Recurring monthly: `(amount / 30) × periodDays`
   - Recurring yearly: `(amount / 365) × periodDays`
   - Respects `recurringUntil` (rule stops applying after that date) and `date` (rule hasn't started yet if it's in the future)
   - One-time: literal amount if date falls in range, else 0

2. **New helper `computePeriodTotal(expenses, start, end)`** — sums all contributions. Building block for stats.

3. **`computeExpenseStats` rewritten** to use these — so hero total, category breakdown, and 6-month sparkline all prorate correctly.

4. **`ExpensesView` list filter** — recurring records now always appear (regardless of time filter) as long as they're active in the selected period. One-time still filters by date.

5. **`filteredTotal`** in the toolbar — now uses proration so it matches the hero and analytics. On "all" filter it just sums literal amounts (no proration makes sense when there's no period).

## Numbers now agree

After deploy:
- Expenses hero "صرفَك هذا الشهر" = Analytics `totalExpenses` for this month's filter
- Expenses list total for a period = same math
- Category breakdown = matches Analytics breakdown modal
- 6-month sparkline = matches Analytics trend chart

## Files touched (2)

- `src/lib/expenseUtils.js` — added `contributionInPeriod` + `computePeriodTotal` helpers, rewrote `computeExpenseStats` to use them
- `src/components/views/ExpensesView.jsx` — updated `filtered` memo to treat recurring as always-active, updated `filteredTotal` to use proration

No schema changes. No API changes.

## Install

```bash
unzip -o rentflow-expenses-phase2c.zip -d .
cp -r patch/src  ./
rm -rf patch rentflow-expenses-phase2c.zip

git add -A
git commit -m "expenses phase 2c: fix recurring records visibility in expenses tab"
git push origin design-md-changes
```

## After deploy — what to verify

1. **Open المصروفات — salaries and rent rows now appear** even on the "This Month" filter. The شهري / سنوي badge in each row's metadata makes it clear they're recurring.
2. **Hero total** should match what Analytics has been showing you all along.
3. **Filter by category → رواتب وموظفين** — should show your staff salary rows now, always visible.
4. **Filter by unit** (deep-link from apartment or P&L) — unit-scoped recurring like rent shows regardless of time filter.
5. **Filter by "الكل"** (all time) — everything shows, no proration (literal amounts).

## Why the record dates still say "May" or "June" etc.

The migrated records still carry their original creation date. That's correct — it tells you when the rule was created. Once Phase 3's recurring cron ships, it'll generate a new record every month with the correct date for that month, and the old records will represent the historical rule origin.

For now, treat the date on a recurring row as "since when this rule has been active" rather than "when this exact payment happened."
