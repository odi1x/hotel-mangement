# Rent Flow — Mobile Phase M2: Core View Adaptations

3 files. The screens people use every day now actually work on a phone.

## What changed

### 1. ResidentsView — table becomes cards on mobile

This was the worst mobile experience in the app. A 6-column table (النزيل / الاتصال / الوحدة / الفترة / الحالة / الإجراءات) at 375px is unreadable — either it clips or you scroll horizontally forever.

**Solution**: keep the desktop table (`hidden md:block`) exactly as-is. Add a **mobile card view** (`md:hidden`) that renders the same data as stacked cards. Each guest gets one card:

```
┌─────────────────────────────────────┐
│ خالد علي واصلي         [مقيم حالياً]│
│ 📞 +966 58 115 1062                 │
│                                      │
│ شقة 93 · 15 يوليو ← 23 يوليو · 8 ليالي│
│ 550 ر.س / ليلة                       │
│                                      │
│                    🖨️  📝  ✏️  🗑️    │
└─────────────────────────────────────┘
```

Follows the video's "one direction per section" rule — stack vertically inside each card, no side-by-side content on mobile. Action icons get **p-2.5** padding (10px) to be a **44px effective tap target** even though the icon is 18px, per the video's tap target guideline.

Price line still respects `canViewPrices` — a receptionist won't see it. Empty state uses the existing `<EmptyState>` component. Skeleton loaders adapted for the card layout too.

### 2. AnalyticsView — chart height responsive

The chart card was `min-h-[440px]` — that's 60% of a 720px viewport height, leaving no room for KPIs above it. On mobile the chart doesn't need to be that tall; you can scroll to see everything.

Now: **`min-h-[320px]` on mobile, `md:min-h-[440px]` on desktop**. Chart card also gets `p-4 md:p-5` — slightly tighter on mobile. All other analytics work was already responsive (KPI grid stacks 1-col on mobile, hero math hides on mobile, right column already stacks below chart at `lg:` breakpoint).

### 3. LoginView — mobile-first tweaks

Was already tolerable on mobile (centered card, `p-4` outer, `max-w-md`), but:
- Card inner padding: **`p-6 md:p-8`** (tighter on mobile, comfortable on desktop)
- Section spacing: **`mb-6 md:mb-8`** on the brand block
- Input fields: **`h-11 text-base`** — larger tap target and 16px font (browsers won't auto-zoom on focus)
- Submit button: **`h-12`** (48px) — bigger than the default `h-11` for a primary action
- Added `autoComplete="username"` / `autoComplete="current-password"` / `autoComplete="new-password"` — password managers now work correctly on iOS/Android

## What I did NOT change (and why)

**MaintenanceView, PricingView, BalancesView stat card grids** — I checked, they already use `grid-cols-1 md:grid-cols-4` (or 3) — they stack to 1-col on mobile automatically. No change needed.

**RequestsView** — already card-based with a decent empty state. Works on mobile as-is.

**ApartmentsView** — grid is already `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`. Cards have `hover:-translate-y-0.5` which gracefully degrades on touch. Not worth touching.

**SettingsView** — 8 responsive classes, mostly works. Might revisit if you notice issues.

## Install

```bash
unzip -o rentflow-mobile-m2.zip -d .
cp -r patch/src  ./
rm -rf patch rentflow-mobile-m2.zip

git add -A
git commit -m "mobile(m2): residents cards + analytics chart height + login tweaks"
git push origin design-md-changes
```

## After deploy — what to look at

**On phone, open سجل النزلاء.** Each guest should be a stacked card with name at top, status badge on the trailing edge, unit + dates + nights in the middle, and action icons at the bottom aligned to the trailing edge. No horizontal scroll, no clipped columns. Tap any icon — targets should feel comfortable (not tiny).

**On phone, open التحليلات.** Scroll through: hero card (Net Profit big), 3 supporting KPIs stacked, chart at 320px tall (not the desktop 440px), top performers below, marketing sources below that. Should feel like a report you scroll through.

**Log out and log in on phone.** Card should fit comfortably with 24px inner padding. Inputs should be 44px tall with 16px text (no zoom-on-focus). Try letting your password manager fill it — should work.

**On desktop:** nothing should look different. All the `md:` conditions preserve current desktop appearance.

## What's next

**Phase M3 — modals become bottom sheets** on mobile:
- BookingForm, BookByDateModal, PaymentLedgerModal, MaintenanceIssueForm, PricingRuleForm, StaffFormModal, ProfileSettingsModal
- Slide up from bottom, rounded top corners, drag handle at top, full-width
- The video calls this out specifically as the modern mobile pattern for context-preserving actions
- Requires a new `.sheet-*` utility class set + touch on each modal

**Phase M4 — timeline views + polish**:
- Availability grid: sticky unit column + horizontal scroll for dates
- Pricing timeline: same treatment
- PublicBookingView (guest-facing, likely mostly mobile) — dedicated pass
- Touch target audit across all views

Deploy M2, check it on your phone alongside M1, tell me what still feels wrong. Or if the residents cards / login look good, say **"ship M3"** and I do the bottom sheets — that's the biggest remaining "this doesn't feel native" complaint.
