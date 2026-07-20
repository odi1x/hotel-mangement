# Rent Flow — Fixes: BookingForm Scroll + Availability View Mode

2 files. Two fixes to what you flagged in the last screenshots.

## What changed

### 1. BookingForm now scrolls internally on mobile (the real bug)

**The bug**: after the M3 bottom-sheet migration, `BookingForm` had `overflow-visible` on its shell and no height cap. On mobile with `items-end` (bottom sheet mode), the shell just extended past the viewport with no way to scroll. You could see the date pickers and the top of the guest info form but couldn't reach the submit button — it was permanently below the fold, no matter how you swiped.

**The fix**:
- Shell: added `flex flex-col max-h-[92vh] overflow-hidden` so the modal caps at 92% of viewport height. The header (drag handle + title strip) is `shrink-0`. The form body gets `flex-1 overflow-y-auto min-h-0` — it's the scroll container.
- Backdrop: dropped the old `md:overflow-y-auto md:pt-10 md:pb-32` desktop top-anchored scroll pattern. Both platforms now use the same simple `items-end p-0 md:items-center md:justify-center md:p-4` pattern. Internal scroll works everywhere.
- Form padding: `p-4 md:p-8` — less padding on mobile so more content fits.

After this, the booking form should scroll cleanly on both mobile (sheet fills to top of viewport, form scrolls inside) and desktop (modal centered, form scrolls inside if tall).

### 2. Availability view mode: pills instead of dropdown

**Your ask**: the `<select>` dropdown for view mode was opening a bulky native menu that covered the availability grid content when tapped.

**The fix**: replaced the `<select>` with the same `nav-pill-group` desktop uses, but ultra-compact on mobile: `text-2xs`, `px-1.5`, `py-1`. All three options (أسبوع / نصف شهر / شهر) are **always visible** as small pills — no dropdown menu to open, nothing gets covered.

Trade-off: pills take slightly more horizontal space than a closed select. To make room:
- Header padding: `p-3 md:p-4` (tighter on mobile)
- Navigation chevrons: 14px on mobile / 18px desktop
- "اليوم" pill: `px-1.5` on mobile / `px-4` desktop, `py-0.5` on mobile / `py-1` desktop
- Filter icon: 14px on mobile / 15px desktop, `h-8` height on mobile / `h-9` desktop

Everything now fits comfortably in one row on 375px width.

## Install

```bash
unzip -o rentflow-scroll-fix.zip -d .
cp -r patch/src  ./
rm -rf patch rentflow-scroll-fix.zip

git add -A
git commit -m "mobile fixes: bookingform scroll + availability view mode pills"
git push origin design-md-changes
```

Two files: `src/components/ui/BookingForm.jsx` and `src/components/views/AvailabilityView.jsx`.

## After deploy — what to check on phone

1. **Tap an empty cell in Availability** — booking form slides up from the bottom, drag handle at top. You should be able to scroll down through: date pickers → guest info → stay details → confirm button. The submit button should be reachable.
2. **Availability header** — you should see the pill group with أسبوع / نصف شهر / شهر all visible at once (small). Tapping any pill switches view mode instantly. No dropdown menu opens, nothing gets covered.
3. **Range label** — still on one line with abbreviated months (e.g., "17 يول - 15 أغس").
4. **Filter button** — still icon-only, still fits.

Desktop: everything should look identical to before. The pills / navigation / filter are unchanged size for `md:` widths.
