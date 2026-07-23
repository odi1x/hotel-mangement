# Rent Flow — Expenses Phase 2a: Per-Unit P&L

The insight your data was hiding. Every unit now shows its actual profit after costs — not just revenue, but revenue minus direct expenses minus its share of business overhead.

## Why this matters

You've been looking at revenue-per-unit forever. Which is useful, but it's not the same as "which unit is making me money." A high-revenue unit that eats maintenance calls and has expensive rent isn't necessarily profitable. A quiet unit with low costs might quietly out-earn the busy ones.

Per-unit P&L exposes that. The math is:

```
Net Profit = Revenue − (Direct Unit Expenses + Share of Global Expenses)
```

**Direct unit expenses** = every Expense with `scope='unit'` and `apartmentId=this` (rent, salaried cleaning, maintenance costs, per-unit misc).

**Share of global expenses** = total scope='global' expenses ÷ number of filtered apartments. Equal split. Fair for fixed overhead like insurance, admin salaries, marketing that doesn't attribute to a specific unit.

**Recurring expenses** are prorated by period (monthly rent × period_days / 30).

## What you'll see

New section in Analytics: **الربحية حسب الوحدة** (Profitability by Unit).

**Desktop**: dense table with columns
- # rank (top-1 profit gets accent chip)
- Unit name
- Revenue
- Expenses (tooltip on hover shows the direct/global split)
- Net Profit (loss shows as accent-strong)
- Margin %
- Occupancy %

**Mobile**: card list. Profit is the headline; revenue + expenses are supporting stats. Rank chip in top-right. Loss units also render in accent-strong.

Sorted by net profit descending — money-makers first, cash-bleeders last.

## Design choices worth mentioning

**No red for losses.** In a monochrome design with a green accent, red would feel out of place and unnecessarily alarming. Loss units use `text-accent-strong` (deeper green) — signals "attention" without accusing. The negative sign carries the actual meaning.

**Rank chip only on top-1 with positive profit.** If every unit is losing money, no gold star for "best of a bad bunch." The chip communicates "this one's your winner" — meaningless if there's no winning.

**Equal-split apportionment for global costs.** Not by nights, not by revenue. Rationale: fixed overhead (rent for HQ, admin salaries, marketing that promotes the brand) doesn't scale with how much each unit gets used. Alternative apportionment schemes are configurable later (Phase 2b if you want).

**Tabular numerics everywhere.** Every number uses `font-variant-numeric: tabular-nums` so digits line up in columns. Standard accounting-software convention.

**Per-unit table is full-width, not squeezed into a sidebar.** This is the payoff data of the whole expense system. Deserves the space.

## What this doesn't include yet

- **Per-booking variable costs** (per_booking cleaning fee, percentage platform fee): still calculated per-booking in the main total but not attributed per-unit in this breakdown. Reason: they're already inside `revenue` calculation for the booking's month. Adding them again per-unit would double-count.
- **Direct comparison to last period**: no "this vs previous quarter" for units yet. Could add.
- **Drill-down**: clicking a unit's row doesn't yet open its full expense list. Should probably deep-link to ExpensesView filtered by that apartment. Phase 2b if useful.

## Only works post-migration

Per-unit P&L requires the Expense table as source of truth. Pre-migration users (haven't opened the Expenses tab yet) get an empty `perUnitPnL` array from the API and the section doesn't render. Once they visit Expenses, migration runs, and the section appears next time they refresh Analytics.

If you're already post-migration (Phase 1b deployed and Expenses opened), this section shows immediately.

## Files touched (2)

- `api/analytics.js` — added `perUnitPnL` computation after the main revenue/expense loops. Only computed when `useExpenseTable` is true. ~90 new lines. Includes proper handling of recurring vs one-time expenses, scope-based filtering, and equal-split apportionment for global overhead
- `src/components/views/AnalyticsView.jsx` — added `perUnitPnL` derived memo, added the profitability section between the top-performers row and the trend chart. Desktop table + mobile card list

## Install

```bash
unzip -o rentflow-pnl-phase2a.zip -d .
cp -r patch/api  ./
cp -r patch/src  ./
rm -rf patch rentflow-pnl-phase2a.zip

git add -A
git commit -m "expenses phase 2a: per-unit P&L in analytics"
git push origin design-md-changes
```

No schema changes. No migration needed. Just deploys.

## After deploy — what to verify

1. **Open Analytics** — you should see a new section "الربحية حسب الوحدة" between the top-performers/sources row and the trend chart.
2. **Check the top row** — should be your most profitable unit. If it's surprising (i.e., a unit you didn't think was your best), that's exactly the insight this section exists to surface.
3. **Check the bottom rows** — losing units render in accent-strong. If any of your units are unexpectedly losing money, dig into why (maintenance-heavy? rent too high vs occupancy?).
4. **Try filtering by apartment** — the P&L should show only the selected units, with global expenses re-apportioned across just those.
5. **Try different time ranges** — recurring monthly expenses will prorate correctly.
6. **Mobile** — card layout should be readable, no clipping.

## What questions this should answer for you

- Which specific units are actually making you money?
- Is any unit consistently losing money after full costs?
- Does your top-revenue unit stay top after expenses?
- What margin % are you running per unit? (Healthy vacation rental margins are typically 20-40% after all costs)
- Are you profitable overall, and if so, which units are subsidizing which?

If the numbers make you rethink anything about your unit mix, pricing, or per-unit costs — this section did its job.

## What Phase 2b could bring next (based on what you find useful)

- **Deep-link from a P&L row → ExpensesView filtered by that unit** (Phase 1a already supports `?apartmentId=` filter param, needs UI plumbing)
- **Comparison vs previous period** — mini-sparkline next to each unit
- **Per-category breakdown within a unit** — "this unit's costs are 60% maintenance, 30% rent"
- **Break-even nights calculator** — "you need X nights/month to break even on this unit"

Try Phase 2a first, tell me which of these would actually be useful vs which sound useful but you'd never open.
