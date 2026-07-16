# Rent Flow — Batch B: Signature Polish

4 files. The signature moves on the three views you built.

## What changed

### 1. Analytics right column — fixed the squished cards

**The problem you flagged**: on the analytics page, the "الأعلى أداءً" card only showed 2 rows (should be 3) and the "مصادر التسويق" donut chart was squished, with the "زيارة مباشرة" label bleeding off the card edge.

**Root cause**: two cards forced to share fixed vertical space via `flex-1 flex-1`. When content is heavy, both get crushed. The donut chart needs a roughly square aspect ratio to render legibly, so it always fights the height constraint.

**Fix**:

- **Right column now scrolls when needed** (`overflow-y-auto`). Both cards get natural content-height (`shrink-0`) instead of fighting over half the space each. If everything fits — no scroll. If it doesn't — scroll gracefully. This is what the rest of the app already does.

- **Donut chart → compact ranked list.** The pie/donut format was fundamentally wrong for this small a card. Now each source renders as one row:

  ```
  زيارة مباشرة                                5 حجز · 45%
  ██████████████████████████░░░░░░░░
  Airbnb                                        3 حجز · 27%
  ████████████░░░░░░░░░░░░
  Booking.com                                   2 حجز · 18%
  ████████░░░░░░░░░░░░░░░
  ```

  Sorted by count descending. The top source gets the emerald accent bar (concentrating attention on the biggest source). Others get muted-gray bars (respecting the scarce-accent rule). Way more space-efficient, reads instantly, no cropped labels.

- **Top performers row rhythm** — dropped the `justify-center` on the row container. Centering rows vertically was actively harmful when space was tight — it collapsed rows onto each other. Now rows stack from the top with consistent `gap-1.5`, capped at max 5.

Removed the recharts `PieChart`, `Pie`, `Cell`, `Legend` imports and the `COLORS` constant since none are needed anymore. Slightly smaller bundle as a bonus.

### 2. Maintenance — days-open badge for aging urgent items

Before: when an urgent maintenance issue had been open ≥ 3 days, the "days open" label got tinted with `text-accent-strong`. Legible, but visually forgettable — it disappeared into the meta row.

After: those aging urgent items now render the days-open label as a **dashed accent badge** using `.badge-dashed` with the accent border:

```
شقة 93 · تكييف · [منذ 5 أيام]   ← dashed accent border, stands out
```

Normal-severity or new items still render the days-open as plain text. Only urgent-and-aging gets the badge treatment — because that's the exact case where the reality check matters most. When you scan the list, your eye catches those badges immediately.

### 3. Pricing — losing rule bars now dim in overlaps

Before: overlapping rule bars in the timeline stacked on top of each other, and the priority winner wasn't visually distinguishable. If you had a "Ramadan ×1.5" rule (normal priority) and a "Hajj @ Nuzha" rule (high priority) overlapping, you couldn't tell from the timeline which one actually gets applied.

After: any rule that loses to a higher-priority overlapping rule renders at **40% opacity**, with hover restoring to 80%. Winners render at full opacity.

Matches the actual resolution logic in `pricingUtils.js`:
- Higher priority wins outright
- On tie, apartment-specific rule beats global

Titles on dimmed bars also change to `"— تتراجع أمام قاعدة أعلى أهمية"` so hovering tells you *why* it's dimmed. Priority is now visible on the timeline, not just in the form. Correcting a mis-ordered priority also becomes a game of "spot the dimmed bar and bump its importance up".

### 4. Balances — sort toggle unified + hex leak sweep

Before: the sort toggle (الأقرب مغادرة / الأكبر مبلغاً) used hand-rolled buttons with a custom active state — inconsistent with the sub-nav pattern used everywhere else (Settings, chart-range picker, maintenance filters).

After: migrated to the `nav-pill-group` + `nav-pill` + `nav-pill-active` pattern. Same behavior, but now it visually belongs to the same family as every other "pick one from a small set" control in the app.

Also, the eyebrow label above the sort toggle was still using the inline `text-xs font-semibold uppercase tracking-wider text-muted` pattern. Migrated to the `.eyebrow` utility class I added in Phase 3. That's the pattern for all uppercase micro-labels.

Bonus: swept 2 remaining `text-[10px]` instances in this file that my earlier passes missed (this file wasn't in Phase 2's working copy). No more `text-[10px]` anywhere in the codebase.

**Note on "stronger CTA per row"** — I mentioned this in the audit but on inspection the row's "تسجيل دفعة" button already uses `.btn-accent`, which is the strongest button in the design system. Nothing to strengthen. Kept as-is.

## Install

```bash
unzip -o rentflow-batch-b.zip -d .
cp -r patch/src  ./
rm -rf patch rentflow-batch-b.zip

git add -A
git commit -m "design(batch b): analytics right column + maintenance aging badges + pricing overlap dim + balances sort"
git push origin design-md-changes
```

Four files. No schema changes. No API changes.

## After deploy — what to look at

1. **Open analytics.** Right column should now show 3+ top performers with full row breathing, and marketing sources should render as a clean ranked list with subtle horizontal bars. If the column has more content than fits, scroll works.

2. **Log a maintenance issue as urgent, wait 3+ days.** (Or find one already aged.) The days-open indicator should now be a dashed accent badge, not just tinted text.

3. **Open pricing.** If you have any overlapping rules with different priorities, the loser should render dimmed. Hover reveals a "تتراجع أمام قاعدة أعلى أهمية" tooltip.

4. **Open balances.** Sort toggle should look identical to the sub-nav in Settings and the chart-range picker on analytics. Same DNA.

## What's still on the list (if you want to keep going)

**Batch C — Bigger refactors**
- AvailabilityView: replace custom mini-calendar with DatePickerCal (~60 line reduction)
- Settings: extract `.tab-underline` utility
- Residents: shorter column headers + drop "created-by" line

These are lower priority since they're more about code hygiene and micro-tightening than "user notices it looks better". Only worth it if the design pass momentum is still there.

Any of the previous polish items still bugging you after deploy? Or any new observations from using the app between deploys? I'd rather fix specific things you notice than chase generic improvements at this point.
