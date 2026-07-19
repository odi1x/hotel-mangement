# Rent Flow — Mobile Phase M4: Total Mobile Redesign

7 files. The final mobile pass. Fixes what you flagged: unusable stat grids, timeline dead on mobile, the visible split above the nav.

## The split you saw at the bottom

**Root cause**: Layout's `<main>` had `pb-28` on mobile — 112px of empty space at the bottom to make room for the floating nav. But that empty space was *inside* main, showing bg-page below wherever the view container's bg-canvas ended. Where the view card ended (with its hairline border-b + rounded-b), a horizontal edge became visible above the empty area.

**Fix**: removed `pb-28` from main (`p-4 pb-4 md:p-6 md:pb-6` uniform now). Each view's scrollable content area got `pb-24 md:pb-0` instead — safe area inside the scroll, so the last card can scroll past the nav. Main's bg-page now extends seamlessly to the viewport bottom under the floating nav. No visible split.

## The four view redesigns

### **BalancesView** — 3 stacked cards → 1 hero + inline sort

**Before**: `إجمالي المستحقات` card + `إجمالي المحصّل` card + `الترتيب` (sort) card, all stacked full-width on mobile. Three tall cards for a page with no dues yet.

**After (mobile only)**: single card with both numbers on one row — big "إجمالي المستحقات" number on the leading edge, small "محصَّل" figure trailing edge, subtle accent tint. Sort pills (`nav-pill-group`) inline below — no card wrapper. Way less vertical space, still shows all the key numbers.

Desktop layout unchanged.

### **MaintenanceView** — 4 cards showing zeros → compact 4-quadrant strip

**Before**: 4 stat cards (مفتوحة الآن / عاجلة / قيد المعالجة / أنجزت هذا الشهر) at ~100px each = 200px just for 4 zero counters.

**After (mobile)**: one card containing 4 mini-stats side-by-side, divided by hairlines. Each mini-stat: tiny icon + label + big number. Total height ~70px instead of 200px. Same 4 pieces of info, one-fifth the space. Urgent count still uses accent-strong when > 0.

Desktop 4-card grid unchanged.

### **PricingView** — timeline hidden on mobile, focus on the rules list

**Before**: The 12-month timeline card was the primary UI. At 375px viewport, each month gets ~30px — month labels overlap into unreadable soup ("يوليوأغسطسسبتمبر...").

**After (mobile)**:
- **Timeline card entirely hidden** (`hidden md:block`) — the visualization doesn't work at phone width, no point pretending otherwise
- Replaced with a **compact action strip**: scope filter dropdown on the leading edge + "قاعدة جديدة" button on the trailing edge. One row, functional
- Stat cards consolidated into the same 3-mini-stat strip pattern (like maintenance): Total / Active now / Global
- The rules list (`قائمة القواعد`) becomes the primary UI on mobile — which is what actually matters

Desktop timeline unchanged.

### **AvailabilityView** — narrower unit column

**Before**: Unit column locked at 150px on all screens. At 375px viewport that leaves ~225px for dates, showing only ~6 dates before needing to scroll.

**After (mobile)**: Unit column narrows to 100px (media-query detected via `window.matchMedia`). Now ~275px for dates → shows 7 dates in month mode, 4 in half-month, or 3 in week. Horizontal scroll still works exactly as before. The 100px is enough for "شقة 93", "غرفة 93", "119" — same units that were fitting in 150px.

Desktop 150px unit column unchanged.

## Files touched

- `src/components/layout/Layout.jsx` — main padding: removed mobile pb-28
- `src/components/views/BalancesView.jsx` — mobile-only hero + inline sort
- `src/components/views/MaintenanceView.jsx` — mobile-only 4-quadrant strip + MobileStat helper
- `src/components/views/PricingView.jsx` — hide timeline + mobile action strip + 3-quadrant stat strip + PricingMobileStat helper
- `src/components/views/AvailabilityView.jsx` — responsive unit column width + safe area
- `src/components/views/ResidentsView.jsx` — safe area on mobile card list
- `src/components/views/AnalyticsView.jsx` — safe area on scroll container

## Install

```bash
unzip -o rentflow-mobile-m4.zip -d .
cp -r patch/src  ./
rm -rf patch rentflow-mobile-m4.zip

git add -A
git commit -m "mobile(m4): view redesigns for pricing/maintenance/balances/availability + kill nav split"
git push origin design-md-changes
```

## After deploy — what to look at on phone

1. **Bottom of any page** — scroll to the bottom. The bg-page should extend seamlessly under the floating nav. No visible horizontal edge above the nav.

2. **Balances** — should show one card with two numbers on one row, sort pills below. Not three stacked cards.

3. **Maintenance** — should show one compact strip with 4 mini stats in one row, not 4 large cards.

4. **Pricing** — no big timeline anymore. Compact 3-stat strip at top, then a small "scope + قاعدة جديدة" action bar, then the rules list. Much more focused.

5. **Availability** — should show at least 7 dates in month mode without scrolling, and the unit names (شقة 93 etc.) still fit in the narrower column. Horizontal scroll to see more dates.

**Desktop:** open the same views. Should look **identical** to before this patch. All the mobile-only components are behind `md:hidden`, all desktop components behind `hidden md:*` — no crossover.

## What's still worth doing (post-M4 polish)

- **Pricing timeline on mobile — day/quarter view instead of month?** If the rules list alone isn't enough, we could add a very compact horizontal calendar strip (7 days at a time, scrollable) below the actions. But the rules list is probably enough for most flows.
- **PublicBookingView** (guest-facing) — hasn't been touched at all. If guests are booking on phones, that's the most important mobile page. Worth its own patch.
- **Touch target audit** — some icon buttons in older views might be smaller than 44px minimum.

If you want any of those, say the word. Otherwise the mobile pass (M1 → M4) is complete: navigation, content adaptations, bottom sheets, view redesigns, safe area — the app should feel like a mobile app now.
