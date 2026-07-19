# Rent Flow — Mobile M4 Follow-up: Title in Header + Availability Rolling Window + Clipping Fixes

5 files. All four things you flagged from the last round of screenshots.

## What changed

### 1. Page titles now sit right at the top-corner on mobile

**Before**: title (`جدول التوفر`, `سجل الصيانة`, etc.) rendered inside the main content area with `mb-4` and `p-4` padding above it → 24-32px of empty space between the header (profile + bell) and the title. Felt like the title was floating far from the corner.

**After**: on mobile, the title is now rendered *inside the header row itself*, on the leading (RTL right) edge. Same row as the profile pic + bell — occupying the empty space that was previously blank on the right side of the header. That gives the "close to the corner" placement you asked for.

Change:
- `Header.jsx` now accepts a `title` prop and renders it in the header row with `md:hidden` (mobile only) styling: `text-lg font-bold tracking-tight`, truncates with ellipsis for long titles like "المستحقات المالية".
- `Layout.jsx` passes `title={getViewTitle()}` to Header, and the desktop title row is now `hidden md:flex` — desktop is unchanged, big title still lives in the main padding area at `text-3xl`.

Subtitle isn't shown on mobile — most view subtitles are decorative context ("إدارة التأجير اليومي والأسبوعي والشهري بدقة") not core info. Skipping them keeps the header lean.

**Bonus cleanup**: while I was in Header.jsx, I also fixed two remaining hex leaks (`text-[#a1a1aa]`, `bg-[#242424]`) that had been missed in the sweep — now `text-body-dark` and `bg-hairline-dark`.

### 2. Availability: rolling 30-day view instead of calendar month 1-30

Your idea: past bookings don't matter much on the availability view; the near future does. So the "شهر" (month) mode shouldn't show the calendar month 1-30 — it should show 3 days behind today, then 27 days forward. Rolling window centered slightly on today.

Implemented in `AvailabilityView.jsx`:
- `range` useMemo month case: `start = currentDate - 3 days`, then `Array.from({length: 30})` starting there
- `shiftRange` for month: shift by 30 days (not by calendar month), so navigating ← / → moves you a full 30-day chunk at a time

So today (July 19), month mode shows July 16 → August 14. Tap →, you get August 15 → September 13. Consistent 30-day window that always shows a few days of "grounding context" plus the actionable near future.

### 3. Availability view mode selector on mobile — dropdown instead of clipping pills

The `nav-pill-group` with أسبوع / نصف شهر / شهر was fine on desktop but clipped off the left edge on mobile because it was competing with the month label + navigation controls in the same row.

Fix: `hidden md:block` on the pill group, mobile gets a compact `<select>` in the same spot:
```
<select> أسبوع | نصف شهر | شهر </select>
```
All three options reachable, no clipping. Same behavior on desktop as before.

### 4. Maintenance list header — search + button no longer clip

Your image showed the "بلاغ جديد" green button running off the left edge because the search input was `w-64` (256px) and the title + search + button were fighting for the same horizontal row.

Fix: on mobile the row stacks vertically. Title on top, then search (full-width `flex-1`) + button on the next row. On desktop it stays in one row like before.

**Same fix applied to ResidentsView** — same row structure (title + search bar), same potential clipping issue. Now stacks the same way on mobile.

## Files touched

- `src/components/layout/Header.jsx` — accepts and renders `title` on mobile + 2 hex leak fixes
- `src/components/layout/Layout.jsx` — passes title to Header, hides desktop title row on mobile
- `src/components/views/AvailabilityView.jsx` — rolling 30-day + mobile dropdown for view mode
- `src/components/views/MaintenanceView.jsx` — header row stacks vertically on mobile
- `src/components/views/ResidentsView.jsx` — same header row stack treatment

## Install

```bash
unzip -o rentflow-mobile-m4-followup.zip -d .
cp -r patch/src  ./
rm -rf patch rentflow-mobile-m4-followup.zip

git add -A
git commit -m "mobile(m4 followup): titles in header + availability rolling window + clipping fixes"
git push origin design-md-changes
```

## After deploy — what to check on phone

1. **Every tab** — page title should be right up in the header row next to your profile pic. Not floating below with a gap.
2. **Availability tab in "شهر" mode** — if today is 19th, you should see dates starting at 16, ending at ~14 of next month. Tap the next-range arrow → jumps by 30 days.
3. **Availability view mode** — you should see a small dropdown showing "شهر" (or whichever mode is active) instead of pill buttons. All 3 modes reachable via the dropdown.
4. **Maintenance page** — the "بلاغ جديد" button should be fully visible, on its own row below the search input.
5. **Residents page** — same as maintenance: the search input should sit on its own row full-width, not clipping.

**Desktop**: all views should be identical to before. Titles still large in the main area, pill groups still on availability, search bars still in the header rows.

## What's still open

- **PublicBookingView** (guest-facing) — never touched
- **Touch-target audit** — some older icon-action buttons may still be smaller than 44px

If neither is bugging you, the mobile pass is done. If you want either, say the word.
