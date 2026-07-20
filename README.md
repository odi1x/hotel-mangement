# Rent Flow — Mobile Impeccable Pass

10 files. The gradient fade you asked about + PublicBookingView polish + touch-target enforcement.

## 1. Header gradient scrim — content fades under the header

Your call was right. The hard-cut between header and content wasn't classy; the gradient fade is a well-established pattern (iOS Safari, Notion mobile, Cal.com mobile) and it makes the app feel premium.

**How it works**: `.scroll-scrim` utility — a `sticky top-0 h-6 -mb-6` element that sits at the top of a scroll container. As content scrolls up, it passes **behind** this sticky element. The top of the scrim is solid `bg-page` (blending with the header above); the bottom is transparent. Content moving up into the scrim area gets progressively hidden by the gradient — no hard cut.

The `-mb-6` (negative bottom margin) keeps the scrim from taking vertical space; it visually overlays the following content. `pointer-events-none` ensures it doesn't intercept taps. `md:hidden` — mobile only.

Applied to 6 scroll containers (one per view):
- AnalyticsView
- ResidentsView (mobile card list)
- MaintenanceView (issue list)
- PricingView (rules list)
- BalancesView (dues list)
- MobileMoreMenu

Try it: open Analytics on your phone, scroll up. The KPI cards should melt into the header instead of hitting a hard line.

## 2. PublicBookingView — mobile polish

The public booking flow is what your guests see on their phones (probably 90% of usage). It was already OK — form inputs had proper heights, grid stacked, layout worked. But the paddings were too generous everywhere:

- **Header**: `px-4 py-3` on mobile (was `px-6 py-4`). Title + subtitle now truncate with ellipsis if the business name is long; header items also `shrink-0` so rear button doesn't clip.
- **Main container**: `py-6 md:py-12` — half the top spacing on mobile. Was `py-12` all screens which felt like empty space at the top of a phone.
- **Step 2 (unit list) header**: title + "N units" badge stacks vertically on mobile so the badge doesn't fight for horizontal space with the title.
- **Step 3 (guest form)**:
  - Selected apartment preview: image `w-16 h-16 md:w-20 md:h-20`, title `text-base md:text-lg`, `min-w-0` + `truncate` so long apartment names don't blow out the card
  - Form padding: `p-5 md:p-8` (was `p-6 sm:p-8` — sm was too small a breakpoint, phones fell into `p-6`)
  - Heading: `text-xl md:text-2xl` and margin `mb-5 md:mb-6`
- **Step 4 (confirmation)**:
  - Card padding: `p-6 md:p-10`
  - Icon circle: `w-20 h-20 md:w-24 md:h-24`, icon size 40px mobile / 48px desktop
  - Heading: `text-2xl md:text-3xl` (was `text-3xl` = 30px — plenty on phones with 24px)
  - Body text: `text-base md:text-lg`

Everything reads better on mobile without changing desktop.

## 3. Touch-target enforcement

The `.icon-action` utility class had `p-2` (8px padding) giving ~32-36px tap area — under the 44px iOS/Android recommendation. Now:

```css
.icon-action {
  @apply p-2 rounded-md text-muted opacity-80 transition-all
         min-w-11 min-h-11 md:min-w-0 md:min-h-0        /* 44px enforced on mobile */
         inline-flex items-center justify-center shrink-0
         ...
}
```

- **Mobile**: `min-w-11 min-h-11` = 44×44 minimum. Every icon-action across the app now has a proper tap target.
- **Desktop**: `md:min-w-0 md:min-h-0` — no minimum, compact as before.

This propagates to every icon button in every view without touching each file individually — dozens of buttons across ResidentsView, MaintenanceView, BalancesView, PricingView, ApartmentsView, AvailabilityView, AnalyticsView, and modal close buttons.

## Files touched

- `src/index.css` — added `.scroll-scrim` utility, updated `.icon-action` with mobile min tap size
- `src/components/layout/MobileMoreMenu.jsx` — added `<div className="scroll-scrim" />` at top of scroll
- `src/components/views/AnalyticsView.jsx` — scroll-scrim
- `src/components/views/ResidentsView.jsx` — scroll-scrim on mobile card list
- `src/components/views/MaintenanceView.jsx` — scroll-scrim on issue list
- `src/components/views/PricingView.jsx` — scroll-scrim on rules list
- `src/components/views/BalancesView.jsx` — scroll-scrim on dues list
- `src/components/views/PublicBookingView.jsx` — mobile polish across all 4 steps + header
- (also the follow-through files from earlier were already present)

## Install

```bash
unzip -o rentflow-mobile-impeccable.zip -d .
cp -r patch/src  ./
rm -rf patch rentflow-mobile-impeccable.zip

git add -A
git commit -m "mobile(impeccable): scroll scrim + public booking polish + 44px touch targets"
git push origin design-md-changes
```

## After deploy — the moments to look for

**The gradient fade** — most visible on Analytics because the content is tall. On mobile, scroll up through the page. The KPI cards, chart, and rest should visibly fade into the header area (last 24px before the header) instead of hitting a hard edge. Same effect on Residents, Maintenance, Balances, Pricing, and the More menu.

**PublicBookingView on your phone** — go to `/book/<your-id>` and walk through the flow. Should feel tighter and more mobile-native throughout, especially the form step and the success card.

**Icon buttons** — try tapping any small icon button (edit / delete / close in modals) on your phone. Should feel comfortable, not fiddly.

## What's still open

Nothing critical. The mobile pass (M1 → M4 + fixes + this impeccable pass) is functionally complete. Every view has been touched, modals are bottom sheets, tap targets meet standard, the scrim gives that "content flows through" feel.

If specific things still bug you as you use the app, tell me. Otherwise call this done and we can turn to something else on your list.
