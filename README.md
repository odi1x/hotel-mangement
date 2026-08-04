# Rent Flow — Follow-up hotfix (round 2)

Three real issues from your last screenshots. All fixed.

## 1. Analytics showing 2000 for a rule active only ~1 month — FIXED

**Your suspicion was right.** My previous math counted every **calendar month** the rule touched. A rule dated Oct 15 with today = Nov 3 touches two calendar months (Oct 15-31 partial + Nov 1-3 partial), so a 1000/mo rule showed as 2000 even though only one salary had actually been paid.

**Fix: switched to occurrence-based counting.** A recurring rule "fires" on `ruleDate`, then again every N months (1 for monthly, 12 for yearly). We count only occurrences that have already happened (are on or before today) AND fall in the selected filter's period.

Verified with a test script:

```
Rule dated Oct 15, 1000/month, today = Nov 3
  This Month (Nov):   0     ← Nov 15 hasn't happened yet
  This Quarter (Q4):  1000  ← only Oct 15 has been paid
  This Year (2026):   1000  ← same
  All:                1000  ← same

Rule dated Jan 15, today = Oct 20 (9 months later)
  This Month (Oct):   1000   ← Oct 15 has happened this month
  This Year (2026):   10000  ← Jan through Oct = 10 payments
```

The new model matches what would show up on a bank statement.

### One thing to know about the new behavior

If your rule is anchored to day-15 of the month and today is day-3 of a new month, "This Month" will correctly show 0 — the day-15 payment for the current month hasn't happened yet. This is accurate but can feel weird the first time you see it. If you want to check the "expected monthly total including the upcoming payment," use the Quarter or Year filter, or wait until after the anchor day of the month.

## 2. Notification dropdown cut off on desktop — FIXED

**Root cause:** the bell button is on the LEFT side of the header in your RTL layout. My previous fix anchored the dropdown's RIGHT edge to the button's right edge, which for a left-side button pushed the panel off-screen to the left.

**Fix: auto-flip.** The dropdown now checks which half of the viewport the button sits on:

- Button on LEFT half → dropdown extends RIGHTWARD from the button's left edge
- Button on RIGHT half → dropdown extends LEFTWARD from the button's right edge

Both branches also clamp to viewport edges so the panel never runs off either side.

## 3. Filter chip out-of-sync after navigating away — FIXED

**What you saw:** switch to "This Month" chip → go to another page → come back to Analytics → chip shows "This Year" active, but the underlying data reflects "This Month" range. Chip highlight lied.

**Root cause:** `analyticsFilter` (which contains startDate/endDate) lives in DataContext and persists across navigation. `periodFilter` (which controls chip highlight) is local to `AnalyticsView` and resets to `'year'` on every mount.

**Fix:** on mount, if `analyticsFilter` has dates, figure out which chip's range they match and set `periodFilter` to that chip. If they don't match any chip (i.e., custom range from the modal), leave the chip un-highlighted — the "advanced filter" indicator will handle that case.

## Files touched (4)

- `api/analytics.js` — occurrence-based `expenseContributionInPeriod`
- `src/lib/expenseUtils.js` — matching `occurrencesInPeriod` + `contributionInPeriod`
- `src/components/layout/NotificationsDropdown.jsx` — auto-flip positioning
- `src/components/views/AnalyticsView.jsx` — mount-time chip/filter sync

## Install

Apply this on top of the previous `rentflow-batch-hotfix.zip` (or on top of your latest `main`):

```bash
unzip -o rentflow-followup-r2.zip -d .
cp -r patch/. .
rm -rf patch rentflow-followup-r2.zip

git add -A
git commit -m "followup: occurrence-based contribution + notification auto-flip + chip sync on mount"
git push origin design-md-changes
```

## After deploy — what to verify

1. **Analytics with your 1000/month rule** — the total expenses should now match what you'd expect from actual payment history:
   - "This Month" → 1000 if the rule's anchor day has passed this month, else 0
   - "This Quarter" / "This Year" → 1000 × number of anchor days that have passed
   - "All" → same as Year for a rule created this year

2. **Bell icon on desktop** — dropdown opens directly below the bell, no longer cut off. The whole panel is visible with the notifications list, mark-all-read button, etc.

3. **Analytics chip persistence** — switch to "This Quarter", navigate to Expenses or another page, come back to Analytics. The Quarter chip should still be highlighted AND the numbers should reflect quarter, no mismatch.

4. **Filter indicator on load** — still doesn't show the `•` dot or X button unless you actually use the advanced modal filter (this was fixed in the previous patch).

## Still open

- **إجمالي المحصَّل 39,300 vs 10,540** — the SQL diagnostic from the previous README will help you find historical duplicate payments in the DB. The double-submit guard prevents new ones. Run the query once you have Neon console access.
- **Compute burn reduction** — separate patch, no urgency.
- **Weekly automated backups** — after everything else settles.

Say when you want any of those.
