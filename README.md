# Rent Flow — Mobile Phase M1: Bottom Nav Foundation

5 files. The essential first move for mobile. Nothing else works until nav does.

## What changed

### New: floating bottom nav + FAB (mobile only)

`src/components/layout/MobileBottomNav.jsx`

A rounded-pill nav bar with **4 tabs + separated FAB**, floating at the bottom of the screen with `shadow-lift`. This is the pattern the video specifically calls out — "floating with the important action broken out". Both the nav pill and FAB are 56px tall — safely above the 44px minimum tap target.

**The 4 tabs:**
- **التوفر** (Availability) — daily check
- **الطلبات** (Requests) — has pending-count badge
- **النزلاء** (Residents) — daily guest work
- **المزيد** (More) — everything else, with an aggregate badge for hidden urgent items (dues + urgent maintenance)

**The FAB:**
- Always opens the "حجز جديد" flow (booking by date modal)
- Visible only on the three primary content tabs (Availability / Requests / Residents)
- Hidden on المزيد itself and on views reached through it — those aren't "quick new booking" contexts
- Emerald accent, matches the app's one-scarce-color rule

### New: "More" as a whole page

`src/components/layout/MobileMoreMenu.jsx`

The Notion pattern the video describes: when nine sidebar items don't fit in a bar, treat "More" as its own full page. It contains:

- **Profile card at top** — tapping opens profile settings (same modal desktop uses)
- **إدارة المنشأة** section — Apartments / Balances / Maintenance / Pricing (each permission-gated identically to the sidebar)
- **التقارير والإعدادات** section — Analytics / Settings (permission-gated)
- **أخرى** section — dark mode toggle, logout

Each row is a card-style tap target with icon on the leading edge (RTL right), label, optional badge, and a chevron on the trailing edge. Sections are separated by `eyebrow`-style micro-labels for scannability. Permission gates match the existing rules exactly — a receptionist with `canViewPricing: false` won't see the pricing row.

### Sidebar hidden on mobile

`src/components/layout/Sidebar.jsx` — one class change: `hidden md:flex`. On mobile the sidebar completely disappears (no drawer, no hamburger — the bottom nav is the whole navigation model). On md+ (768px+), sidebar returns exactly as-is.

### Layout adapts to mobile

`src/components/layout/Layout.jsx`
- Main content padding: `p-4` on mobile (16px), `md:p-6` (24px) on desktop — matches the video's guidance that spacing stays similar or larger on mobile, but keeps enough room for content on 375px screens
- Main bottom padding: `pb-28` (112px) on mobile to leave room above the floating bottom nav
- Title: `text-2xl` on mobile, `text-3xl` on desktop — still large per the "iOS uses 17px base" principle
- Subtitle: `line-clamp-2` — can't wrap forever on narrow screens
- The desktop "حجز جديد" button in the header area is **hidden on mobile** (`hidden md:flex` wrapper) since the FAB replaces it
- The شارك link box on Apartments is also hidden on mobile — narrow screens don't have room for it
- New view case: `view === 'more'` renders the MobileMoreMenu

### Header cleanup

`src/components/layout/Header.jsx`
- Padding: `px-4 md:px-8` — tighter on mobile
- Fixed two stray `dark:text-[#a1a1aa]` hex leaks that Phase 2 sweep missed (they were re-introduced somewhere post-sweep) → `dark:text-body-dark`
- The name/role text next to the profile picture already hid on `<sm` breakpoints via `hidden sm:block` — no change needed
- Bell + profile pic stay as-is on mobile

## Install

```bash
unzip -o rentflow-mobile-m1.zip -d .
cp -r patch/src  ./
rm -rf patch rentflow-mobile-m1.zip

git add -A
git commit -m "mobile(m1): bottom nav + FAB + more menu — mobile navigation foundation"
git push origin design-md-changes
```

Five files: 2 new (`MobileBottomNav.jsx`, `MobileMoreMenu.jsx`), 3 modified (`Layout.jsx`, `Sidebar.jsx`, `Header.jsx`).

No schema, no API, no data changes.

## After deploy — what to look at

**On desktop (>= 768px):** nothing should look different. Same sidebar, same layout, same everything. The bottom nav is hidden (`md:hidden`), the desktop "حجز جديد" button is still there.

**On phone (< 768px):**
1. Sidebar is gone.
2. Bottom of the screen has a rounded pill nav with 4 tabs (Availability / Requests / Residents / More) and a floating emerald "+" button next to it.
3. Tap "المزيد" — the app content area becomes the more menu: your profile at top, then sections for apartments / balances / maintenance / pricing, then analytics / settings, then dark mode + logout.
4. Tap any item in the more menu → navigates to that view. Bottom nav still shows, and "المزيد" stays highlighted so you know you're in a "more" section.
5. Tap the "+" FAB on any of the three primary tabs → opens the "book by date" flow (same as desktop's حجز جديد button).
6. Badges: red dots on the tab icons for pending requests, and a combined dues + urgent-maintenance count on the More icon.

## Known limitations of M1 (fixed in M2/M3/M4)

**Views themselves are still desktop-first.** Analytics KPIs are still 3-column. Residents is still a 6-column table you have to scroll horizontally to read. Availability is still a wide unit×date grid that clips on 375px. Modals are still centered rather than bottom sheets.

M1 gets you around the app on mobile. M2 makes the content in each view actually readable at 375px. M3 turns modals into bottom sheets. M4 handles the timelines + polish.

## What's next

**Phase M2 — Core view adaptations** (biggest single change to make the app feel usable):
- Analytics: hero math stacks vertically, KPIs go 1-column, right column drops below chart
- Residents: table → cards
- Apartments: 1-col grid on mobile
- Login: proper mobile-first form

**Phase M3 — Modals become bottom sheets** on mobile (booking form, filters, payment ledger, maintenance form, pricing form, staff form)

**Phase M4 — Timeline views + polish** (availability + pricing on mobile, public booking view, touch target sweep)

Deploy M1, look at it on your phone, tell me if the bottom nav feels right — then say "ship M2" and I'll do the content adaptations.
