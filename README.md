# Rent Flow — Batch C: Analytics Scroll Model + Tab Utility + Density Tightening

Four files. Your scroll-model instinct + the Batch C refactors.

## On your scroll-model question — you're right

Column-level scrolling on Analytics (what I shipped in Batch B) was inconsistent with the rest of the app. Every other view (Maintenance, Pricing, Balances, Residents) uses the **same pattern**: fixed page height, one main container with internal scroll on its list content. The page itself never scrolls.

Analytics being the one view where a column scrolls independently was a small friction that compounds — users learn one mental model for how views scroll, and then Analytics behaves differently. That's the kind of inconsistency that reads as "not quite right" without anyone being able to name why.

Fixed in this patch: each of the two right-column cards on Analytics now handles its own content overflow internally, matching how MaintenanceView's issue list scrolls inside its container, or how ResidentsView's table scrolls inside its wrapper. Same DNA.

## What changed

### 1. Analytics scroll model (the fix above)

Both cards in the right column (الأعلى أداءً, مصادر التسويق) now use the standard pattern:

- Card header: `shrink-0` (fixed at top)
- Card content: `flex-1 overflow-y-auto min-h-0` (fills remaining, scrolls when needed)

The cards still get equal vertical space via `flex-1` at the column level, but overflow is handled **inside each card** instead of the column scrolling as a whole. That's the pattern MaintenanceView, PricingView, and BalancesView already use — Analytics now joins them.

### 2. `.tab-underline` utility (Settings pattern extracted)

The top-level tab pattern in SettingsView (border-b-2 -mb-px underline, hover-transition, ink-when-active) was hand-rolled inline classes. It's a real pattern worth reusing, so I extracted it into two utility classes:

```css
.tab-underline        /* base state — muted, transparent border */
.tab-underline-active /* add this when active — ink text, ink border */
```

Usage:
```jsx
<button className={`tab-underline flex items-center gap-2 ${
  activeTab === 'general' ? 'tab-underline-active' : ''
}`}>
```

Applied to SettingsView's two top tabs. Available for any future "top-level tabs above a shared bottom border" pattern.

### 3. ResidentsView column headers tightened

Before:
| معلومات النزيل | الاتصال والهوية | الوحدة / السعر | الفترة | الحالة | الإجراءات |

After:
| النزيل | الاتصال | الوحدة | الفترة | الحالة | الإجراءات |

Shorter headers = wider actual data columns = less horizontal cramping. Same information (the row content still shows ID under the phone, price under the unit name — nothing lost).

## What I deliberately did NOT do

**Drop the "بواسطة: {creatorName}" line under booking rows.** My audit called this out as a density opportunity ("if you never look at 'created-by' in practice, drop it"). But I don't actually know whether you look at it — sometimes staff bookings need to be traced back for accountability. Removing an audit trail is a data-loss change I shouldn't make unilaterally. If you want it dropped, tell me and it's a 1-line delete.

**Replace AvailabilityView's mini-calendar with DatePickerCal.** I overestimated this in the audit — DatePickerCal is a *range* picker (startDate + endDate), while the AvailabilityView mini-calendar is a *single-date* jumper. Making DatePickerCal support single-date mode would be a bigger refactor than the ~30 lines of mini-calendar code it replaces. Not worth it — the mini-calendar works, it's local, leave it alone.

## Install

```bash
unzip -o rentflow-batch-c.zip -d .
cp -r patch/src  ./
rm -rf patch rentflow-batch-c.zip

git add -A
git commit -m "design(batch c): analytics scroll model + tab-underline utility + residents headers"
git push origin design-md-changes
```

Four files. No schema changes.

## After deploy

1. **Open analytics.** The right column should no longer have its own scroll — each card handles overflow inside itself. Behavior on wide screens should look identical to before Batch B (both cards sized to fit); on constrained heights, each card's list scrolls internally.

2. **Open Settings.** The top tab pattern (إعدادات المنشأة / إدارة الموظفين) should look identical to before, but its underlying classes are now the reusable `.tab-underline` utility.

3. **Open سجل النزلاء.** Column headers should feel less wordy. Row content is unchanged.

## Where we are

Design pass status:
- **Phase 1** (foundation): warm tokens + type scale + hex leak infrastructure
- **Phase 2** (mechanical): 398 hex leaks swept
- **Phase 3** (polish): sidebar wordmark, analytics KPI hierarchy, modal utilities
- **Batch A** (cleanup + polish follow-through): EmptyState, apartment badges, analytics polish
- **Batch B** (signature moves): analytics list format, aging maintenance badges, pricing overlap dim
- **Batch C** (this): scroll model correction + tab utility + density

The mainline design system work is done. The system is consistent, the scroll model is uniform, the hierarchy on key screens is clear, and every widely-used pattern has a utility class.

What's still open, if you want:
- Padding rhythm normalization (I deferred this in Phase 3 for good reason — needs per-component judgment)
- Font-weight surgical rebalance (same reason — 192 uses of `font-semibold`, some correct, some overuse)
- One-off screen improvements you notice while using the app

I'd rather stop here and let you use the app for a while, then come back with specific things that still feel off, than chase generic "next improvement" without a concrete pain point. The best design work now is: use it, see what bugs you, tell me.
