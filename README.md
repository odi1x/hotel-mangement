# Rent Flow — Mobile Followup 3: Scrim Positions + Nav-Modal + Dark Icons + Share Link

**Five fixes** to what you flagged in the last screenshots:

## 1. Top scroll-scrim + space between scrim and first component

You wanted the scrim to stay AND for the first component not to be clipped. My last patch removed the sticky-inside-scroll scrim entirely, which was overkill.

**Fix**: kept the fixed viewport scrim (`fixed top-14 h-8`) — that's still there and gives the fade effect. But now every scroll container also has **`pt-2 md:pt-0`** — 8px of padding-top on mobile. That's the "little bit of space" you asked for. First card is now safely below the scrim's opaque band at rest.

Applied to 8 scroll containers: Analytics, Maintenance, Balances, Pricing, Residents (mobile card list), Apartments, Availability grid, and the More menu.

## 2. Bottom scroll-scrim moved UNDER the nav

Was `fixed bottom-20 h-8` — floating 80px above the viewport bottom with a gap between it and the nav (that "line in the middle of the screen" you saw).

**Fix**: now `fixed bottom-0 inset-x-0 h-28` — the scrim extends from the very bottom of the viewport upward for 112px. That's tall enough to cover the whole nav area (nav sits at `bottom-4 h-14` = 16px to 72px from viewport bottom). The gradient uses `from-40%` so the bottom 40% is solid `bg-page`, then fades up to transparent.

Combined with z-index (`z-30` on scrim vs `z-40` on nav), the nav pill sits **on top of** the scrim's solid bottom portion. Content scrolls through the fade band and disappears under the nav — the effect you described.

## 3. Nav hides when a modal / bottom sheet is open

**The bug**: the floating nav is at `z-40`, modal backdrops at `z-50` or `z-[80]`. Backdrops SHOULD cover the nav visually — but backdrops are only `bg-black/40` (40% opaque). The nav's own opaque background (`bg-canvas/85`) was bleeding through.

**Fix**: added a CSS `:has()` rule in `index.css`:
```css
body:has([data-modal-active]) .mobile-nav-shield {
  visibility: hidden;
  pointer-events: none;
}
```

Then added:
- `data-modal-active` attribute on every modal backdrop (13 backdrops across ui/ and views/)
- `mobile-nav-shield` class on the nav wrapper

`:has()` is now supported in Chrome 105+, Safari 15.4+, Firefox 121+ — that covers essentially every phone you'd care about. When any modal is on the DOM, browser detects the attribute, hides the nav. Nav returns automatically when modal closes.

Zero code needed in modals beyond the attribute — no state coordination, no context, no hook. Purely declarative.

## 4. Apartment edit/delete buttons visible on mobile + dark mode

**The bug**: the edit/delete icons on apartment cards had `opacity-0 group-hover:opacity-100` — hover-only. Mobile has no hover, so buttons were permanently invisible. Plus `text-muted` (a mid-gray) had no dark mode variant so they had poor contrast on dark backgrounds even when technically visible.

**Fix**:
- `opacity-0 group-hover:opacity-100` → `md:opacity-0 md:group-hover:opacity-100` (mobile always visible, desktop hover behavior preserved)
- `p-1.5` → `p-2 md:p-1.5` (44px tap target on mobile, tighter on desktop)
- `bg-canvas/95 text-muted border-hairline` → `bg-canvas/95 dark:bg-surface-dark-elevated/95 text-ink dark:text-white border-hairline dark:border-hairline-dark-soft` — proper dark mode contrast
- Hover state now goes to `text-accent` for a color cue (was `text-ink` — same as base)

## 5. Shareable link now accessible on mobile

**The bug**: the "رابط الحجز المباشر للعملاء" card lives in Layout's desktop title bar (`hidden md:flex`). Since mobile title moved into the header, that whole action bar became desktop-only. Guests-of-your-property URL was unreachable from phone.

**Fix**: added a mobile-only version of the shareable link card **inside ApartmentsView**, right above the grid. Only visible to admins + staff with `canBook`. Compact layout:
- Small `Share2` icon on leading edge
- Truncated URL in the middle (tap to select all)
- Copy button on trailing edge with icon transition (`Copy` → `Check` on copy)
- Toast confirmation "تم نسخ الرابط" on copy

Uses the same URL format as desktop: `${origin}/book/${user.adminId}`. Same `handleCopyLink` logic with local state (isolated from Layout's copy).

## Files touched (13)

- `src/index.css` — `:has()` rule for hiding nav on modal open
- `src/components/layout/Layout.jsx` — scrim position fix (bottom-0 h-28)
- `src/components/layout/MobileBottomNav.jsx` — `mobile-nav-shield` class
- `src/components/layout/MobileMoreMenu.jsx` — pt-2 on scroll
- `src/components/views/AnalyticsView.jsx` — pt-2 + data-modal-active on breakdown modal
- `src/components/views/MaintenanceView.jsx` — pt-2
- `src/components/views/BalancesView.jsx` — pt-2
- `src/components/views/PricingView.jsx` — pt-2
- `src/components/views/ResidentsView.jsx` — pt-2 + data-modal-active on inline modals
- `src/components/views/AvailabilityView.jsx` — pt-2 + data-modal-active on inline modals
- `src/components/views/ApartmentsView.jsx` — pt-2 + mobile share card + dark-mode icons + data-modal-active
- `src/components/ui/*.jsx` (7 modals) — `data-modal-active` on backdrops

## Install

```bash
unzip -o rentflow-mobile-followup3.zip -d .
cp -r patch/src  ./
rm -rf patch rentflow-mobile-followup3.zip

git add -A
git commit -m "mobile followup 3: scrim positions + nav-hide-on-modal + apartment dark icons + mobile share link"
git push origin design-md-changes
```

## After deploy — what to actually verify

1. **Open any tab, look at the top of the content.** First card should be fully visible, not clipped under a fade. The fade should still be there (just above the first card).
2. **Look at the bottom of any scrollable view.** The bottom fade should extend all the way to the viewport bottom with the nav pill floating ON TOP of it. No line in the middle of the screen.
3. **Open any modal** (add booking, edit staff, add issue, etc.). The floating nav bar should disappear entirely while the modal is open. Close the modal → nav returns.
4. **In dark mode, tap an apartment card.** The edit + delete icons in the top-left corner of each card should now be visible.
5. **Go to Apartments tab on mobile.** You should see the "رابط الحجز المباشر" card at the top with your public booking URL + a copy button.

## What's not touched

- Desktop: unchanged for everything except the shareable link (still in Layout title bar as before).
- Public booking view: separate structure, has its own scrim; not affected.
- Non-admin staff: shareable link card only shows for admin + canBook.
