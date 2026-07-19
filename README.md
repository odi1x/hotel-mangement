# Rent Flow — Availability Header Fixes

1 file. Three related fixes to the availability header row for mobile.

## What changed

### 1. Range label — smaller + one-line + abbreviated months

**Before**: `text-lg` label like "16 يوليو - 31 يوليو" tried to fit next to navigation controls, view mode dropdown, and filter button — all in one row on 375px width. When the range didn't fit horizontally, the text wrapped into 4 vertical lines ("16" / "يوليو" / "-" / "31" / "يوليو"), which made the whole header row taller and pushed everything below down.

**After**:
- **Mobile**: `text-xs` size, `whitespace-nowrap` so it stays on one line, and uses 3-letter month abbreviations (`ينا / فبر / مار / أبر / ماي / يون / يول / أغس / سبت / أكت / نوف / دسم`). So "16 يوليو - 31 يوليو" becomes "16 يول - 31 يول" — half the width, always one line.
- **Desktop**: full `text-lg` with full month names — unchanged.

Also fixed the range label logic for the new rolling 30-day month mode: it used to show just "يوليو 2026" but that's now misleading because the range crosses month boundaries. All modes now show `{startDay} {month} – {endDay} {month}` format.

### 2. Filter button icon-only on mobile

The button had `<Filter icon> + "كل الوحدات" text`. The text alone is ~80px wide. On mobile that was pushing the button off the left edge.

Now: text is `hidden md:inline` — button becomes icon-only on mobile (~40px), full "Filter كل الوحدات" on desktop. `aria-label` still carries the label for screen readers.

### 3. Filter dropdown fits within viewport

The dropdown was `w-72` (288px) with `absolute left-0`. On mobile where the button is at the far left of the header, the dropdown extended off screen.

Now: width is `w-[calc(100vw-3rem)] md:w-72 max-w-[320px]`. So on mobile it's `viewport width - 48px` (24px on each side for breathing room), capped at 320px so it doesn't get absurdly wide on landscape phones or tablets. Desktop: 288px as before.

### Bonus tightening

- Navigation controls (`< اليوم >`): 16px chevrons instead of 18px, `px-2` on "اليوم" instead of `px-4` on mobile
- Right margin dropped: `mr-0 md:mr-4` — no gap between navigation and view mode on mobile
- Gap between the three left elements: `space-x-2 md:space-x-4` — tighter on mobile
- Whole header row gets a `gap-2` for consistent breathing between the two flex groups

## Install

```bash
unzip -o rentflow-availability-header-fix.zip -d .
cp -r patch/src  ./
rm -rf patch rentflow-availability-header-fix.zip

git add -A
git commit -m "mobile: availability header — short labels, icon-only filter, viewport-fit dropdown"
git push origin design-md-changes
```

Just one file: `src/components/views/AvailabilityView.jsx`.

## After deploy — what to check on phone

1. **Switch between أسبوع / نصف شهر / شهر** — the range label on the right should now stay on one line in all modes. In half month mode expect to see something like "16 يول - 31 يول" instead of the previous stack.
2. **Filter button** — you should see just the funnel icon, no "كل الوحدات" text. It should be fully visible, not clipping off the left.
3. **Tap the filter** — the dropdown panel should open and fit within the phone screen with breathing room on both sides. Calendar picker + units checkboxes should be fully visible.
4. **Month mode** — label should now show a date range like "17 يول - 15 أغس" instead of just "يوليو 2026", correctly reflecting the rolling 30-day window.

Desktop: no visible change. Range label still `text-lg` with full month names, filter button still shows the text, dropdown still `w-72`.
