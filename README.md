# Rent Flow — Batch A: Cleanup Sweep + Analytics Polish

15 files. The follow-through pass after the tab-by-tab audit.

## What changed

### Mechanical sweeps (leftovers from Phase 2)

- **`[#898989]` leak fixed** — one instance in `ResidentsView.jsx` line 236 that my Phase 2 sweep missed because the pattern was different.
- **`text-[11px]` → `text-xs`** — 45 instances across 13 files migrated to the tokenized `text-xs` (12px). Font size shifts by 1 pixel, imperceptible in most cases, gains full type-scale consistency.
- **`BalancesView.jsx` swept** — 15 additional hex leaks Phase 2 missed on this file (it's a Feature 1 file that wasn't in my Phase 2 working copy at the time). Now uses `body-dark`, `hairline-dark`, `hairline-dark-soft` throughout.

### New: `<EmptyState>` component

Extracted the RequestsView empty-state pattern (soft-accent icon disc + heading + supporting subtext + optional CTA) into `src/components/ui/EmptyState.jsx`. Two variants:

- `variant="soft"` (default) — plain empty state on a card
- `variant="dashed"` — dashed border around the whole block, for "nothing here yet" states

Applied in three places this pass:
- **BalancesView** — replaced the inline "all balances paid" empty state
- **ResidentsView** — replaced the single-line "لا توجد حجوزات مطابقة" with a proper empty state inside the table cell
- **ApartmentsView** — added a first-time-user empty state with a CTA button ("إضافة أول وحدة")

Other views (RequestsView, MaintenanceView) already have good empty states — I left those alone rather than force-migrate. Their patterns will drift toward `<EmptyState>` naturally when they're touched next.

### ApartmentsView: custom status pills → `.badge-*` variants

The three status badges on unit cards (متاحة / مشغولة / تحتاج تنظيف) were hand-rolled with backdrop-blur classes:

```jsx
<span className="inline-flex items-center gap-1.5 rounded-full text-xs font-semibold px-2.5 py-1 bg-canvas/90 text-ink border border-dashed border-muted-soft backdrop-blur-sm">
```

Now use the design-system `.badge-*` treatments:

```jsx
<span className="badge-pill badge-dashed backdrop-blur-sm bg-canvas/90 dark:bg-surface-dark/90">تحتاج تنظيف</span>
<span className="badge-pill badge-solid backdrop-blur-sm bg-ink/90 dark:bg-white/90">مشغولة</span>
<span className="badge-pill badge-outline backdrop-blur-sm bg-canvas/90 dark:bg-surface-dark/90">
  <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
  متاحة
</span>
```

Same visual result, but now these pills share their DNA with every other badge in the app. First time you want to tweak how a "warning" badge looks, one class change updates every warning badge everywhere.

### Analytics polish (following up on my Phase 3 self-critique)

Two of the observations I flagged after your Phase 3 deploy, now fixed:

**1. Missing subtitle on the Revenue KPI card.** The other two supporting cards (Occupancy, Nights) both had a subtitle line, but Revenue sat alone with just a number — making its tile look "shorter" than its peers. Now shows "عبر X حجز" (matching the Nights card's own subtitle format).

**2. Empty left side of the hero card.** The profit hero had a lot of dead trailing whitespace on wide screens. Now that space carries the **math behind the profit**:

```
صافي الأرباح            الإيرادات        المصروفات
6,940 ر.س      =        8,940 ر.س   −   2,000 ر.س
الإيرادات ناقص ...
```

Two small stacked figures on the trailing (LTR-left) edge with a subtle `−` separator. Turns "6,940" from an abstract number into a visible story: *revenue minus expenses equals profit*. On mobile (narrow screens) they hide with `hidden md:flex` since the hero is already tall enough.

Uses `analytics.totalExpenses` if provided by the API, otherwise computes it as `totalRevenue - netProfit`. Won't break if the field isn't there.

**Two other polish items I diagnosed and then found weren't real:**

- The right-column cards (top performers, marketing sources) already use `text-lg` numbers, not `text-3xl`. My earlier "they feel loud" call was a misread from the screenshot. No change needed.
- The chart title weight is fine at `font-semibold`. It's a card-level heading, one size below the page heading — appropriate.

## Install

```bash
unzip -o rentflow-batch-a.zip -d .
cp -r patch/src  ./
rm -rf patch rentflow-batch-a.zip

git add -A
git commit -m "design(batch a): sweep leftovers + EmptyState + apartments badges + analytics polish"
git push origin design-md-changes
```

15 files. No schema changes, no API changes.

## After deploy — what to look at

1. **Open analytics.** Look at the hero. On wide screens you should see the math breakdown on the trailing side (Revenue − Expenses). On mobile, hero shrinks to just the profit number as before.
2. **Look at the Revenue supporting card.** Should now have "عبر ٥ حجز" (or however many bookings) as a subtitle, matching Nights.
3. **Open apartments.** If you have zero apartments, empty state should appear with a "إضافة أول وحدة" CTA. If you have apartments, the status pills should look identical to before but they're now sharing DNA with the rest of the design system.
4. **Empty a filter on residents.** The "لا توجد حجوزات مطابقة" state should now be a proper empty state with an icon and helpful subtitle, not a single-line message.
5. **Pay off all balances.** BalancesView empty state should show the "عمل ممتاز" message with the wallet icon.

## What's next

**Batch B — Signature polish** *(the signature moves)*
- Maintenance: days-open badge for urgent-and-aging items
- Pricing: opacity dim on losing rule bars in overlaps (makes priority visible)
- Balances: nav-pill-group for the sort toggle + stronger CTA per row

**Batch C — Bigger refactors** *(only if you want)*
- AvailabilityView: replace custom mini-calendar with DatePickerCal (~60 line reduction)
- Settings: extract `.tab-underline` utility
- Residents: shorter column headers + drop "created-by" line

Say the word to ship Batch B, or take a look at Batch A first and confirm you like the direction.
