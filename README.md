# Rent Flow — Analytics Phase 2f: Structural + math fixes

Three real problems in Phase 2e. All fixed here.

## 1. Broken layout — everything nested inside the trend chart

**What happened:** my Python reordering script in Phase 2e didn't correctly extract the trend chart's outer div bounds. Result: the Sources card and Per-Unit P&L got pasted *inside* the trend chart's title `<div>`. The trend chart's own body (KPI strip + AreaChart) ended up orphaned somewhere below, still rendered but structurally wrong. Layout looked visibly broken with everything cramped into one card.

**Fix:** deleted the entire scrambled section and hand-wrote it cleanly. Two cells in a 3-col grid: trend chart (2/3) + sources (1/3). Per-unit P&L as its own full-width card below the grid. Every div properly opened and closed.

## 2. Chips were on their own row, wasting space

**What happened:** in Phase 2e I put the period chips on a separate row below the action strip. That row was ~40px of dedicated space for what should have been inline with the filter button.

**Fix:** chips moved inline with the "تصفية" button in the top action strip. Same row. Wraps on narrow screens (`flex-wrap`), stays one line on wider. No dedicated row anymore.

Layout now:
```
[تصفية] [هذا الشهر] [الربع] [السنة ✓] [الكل]              [Excel]
```

## 3. Yearly profit less than monthly profit (the confusing one)

**What was wrong:** for a 1000 SAR/month salary that started July 23, 2026:
- "This month" filter → 1,000 in expenses ✓
- "This year" filter → **6,000** in expenses ✗ (counting Jul + Aug + Sep + Oct + Nov + Dec = 6 months)
- "All" filter → 1,000 ✓

Yearly showed 6× the monthly because my proration counted the rule's future occurrences (Aug through Dec). But you haven't paid August salary yet — it's July. Future months shouldn't be in a P&L, they're projections.

Concrete: revenue for the year is 10,540 (real bookings). Expenses shown 6,000 (5 future months of imaginary salary payments). Net: 4,540. Less than "this month" which showed 7,650 profit (revenue 8,650 - expenses 1,000). Nonsense.

**Fix:** effective end of a recurring rule is now capped at `min(rule end, period end, TODAY)`. Future months of recurring rules don't count until they actually happen.

Verified with a test:
```
1000/month salary started Jul 23, today = Jul 25
  This month (July):  1,000  ✓
  This year (2026):   1,000  ✓  (only 1 month has actually passed)
  All time:           1,000  ✓
```

All three periods now agree, as they should.

**Consequence:** each period's expense number represents money **actually spent** in that period, not projected obligations. If you want a "what will this year cost me" projection, that's a separate concept — not what analytics should show by default.

## Files touched (3)

- `src/components/views/AnalyticsView.jsx` — layout rebuild + chips inline
- `api/analytics.js` — today-cap in `expenseContributionInPeriod`
- `src/lib/expenseUtils.js` — same fix in the frontend helper

## Install

```bash
unzip -o rentflow-analytics-phase2f.zip -d .
cp -r patch/api  ./
cp -r patch/src  ./
rm -rf patch rentflow-analytics-phase2f.zip

git add -A
git commit -m "analytics phase 2f: fix broken layout + inline chips + cap recurring at today"
git push origin design-md-changes
```

## After deploy — what to verify

1. **Layout is clean**: KPI hero at top, then 3 KPI cards, then trend chart (left, 2/3) + sources (right, 1/3) side-by-side, then per-unit P&L full-width below. No overlapping or nesting.

2. **Chips are inline with تصفية**: everything on one row at top: `[تصفية] [chip] [chip] [chip] [chip]              [Excel]`.

3. **Numbers finally consistent across periods:**
   - Your 1,000 salary should show 1,000 in **all** period filters (until August starts).
   - Net profit should be roughly equal or higher for longer periods (all ≥ year ≥ quarter ≥ month, since longer periods can only have more revenue).
   - No more "yearly profit less than monthly".

4. **Excel export button** stays in its old spot on the right side of the action strip.

## Retro (again)

I've made two mistakes in a row:
- Phase 2b: closing brace missing → 500 errors
- Phase 2e: Python script scrambled the DOM → visibly broken layout

Both were "trusted the script output without spot-checking the rendered result." Going forward, when I do structural rewrites via scripts, I'll `view` the affected file at three points (start, middle, end of the changed region) and count divs before declaring done. Slower, safer.

Sorry for the round-trip.
