# Rent Flow — Mobile Phase M3: Modals Become Bottom Sheets

13 files. Every modal in the app now slides up from the bottom on mobile like a native app.

## The pattern

Desktop stays centered — a modal with a dark backdrop, rounded on all sides, `max-w-*` limited, no changes to what you see today.

Mobile becomes a **bottom sheet**: slides up from the bottom edge, full-width, rounded top corners only, flush with the screen at the bottom. A **small handle** at the top signals "this is a sheet, not a hard modal" — the video's specific pattern for context-preserving actions.

The gesture (swipe down to close) isn't wired to a real drag library — that would be a bigger project — but the visual handle teaches the pattern. Users can still close by tapping the X, or tapping the backdrop.

## What changed

### `src/index.css` — utility class layer

Three targeted changes to existing utility classes:

**`.modal-backdrop`**: was `flex items-center justify-center p-4`. Now `flex items-end p-0 md:items-center md:justify-center md:p-4`. Aligned to the bottom of the screen on mobile with zero padding (sheet flush to bottom), centered on desktop with 16px inset.

**`.modal-shell`**: was `rounded-xl` + full border. Now `rounded-t-2xl md:rounded-xl` and `border-t md:border` — rounded corners only at the top on mobile, all four on desktop. On mobile the border-t sits at the sheet's top edge as a hairline finishing detail; the shell fills to the screen bottom naturally.

**New: `.sheet-handle`**: the visual drag affordance. `md:hidden` — only appears on mobile. Renders as a 40×4px pill in `bg-hairline` centered at the top of the sheet.

### The 6 modal files

Each modal shell got:
- Backdrop class updated to the responsive bottom-sheet pattern
- Shell rounding: `rounded-xl` → `rounded-t-2xl md:rounded-xl`
- `<div className="sheet-handle" />` inserted right after the shell opens

**Modified:**
- `BookingForm.jsx` — biggest form in the app. Backdrop was uniquely `items-start` (top-anchored scroll for the long form) — I kept that as `md:items-start` and made mobile `items-end` (bottom sheet). Content scrolls internally per Cal-style shells.
- `BookByDateModal.jsx` — the "حجز جديد" flow launched by the FAB
- `MaintenanceIssueForm.jsx`
- `PricingRuleForm.jsx`
- `StaffFormModal.jsx`
- `ProfileSettingsModal.jsx`

### Inline modals in view files

Six more modals live inline inside view files (analytics breakdown, apartments delete confirm, availability booking details, maintenance resolve, pricing edit, residents checkout + others). Their backdrops got the same responsive treatment:

- `AnalyticsView.jsx`
- `ApartmentsView.jsx`
- `AvailabilityView.jsx`
- `MaintenanceView.jsx`
- `PricingView.jsx`
- `ResidentsView.jsx` (3 inline modals in this file — checkout, note, print-selector)

Inline modals did NOT get sheet handles — they're smaller and less form-heavy, so the responsive backdrop + rounded top is enough of a mobile signal. If any of them feels "not sheet-y enough" in use, I'll add handles later.

## Desktop behavior — unchanged

Every `md:` prefix means these changes only apply below 768px. On desktop:
- Modals still centered with 16px backdrop padding
- All four corners still rounded (`md:rounded-xl` reinstates it)
- Full border still present (`md:border`)
- No visible drag handles (they're `md:hidden`)

If desktop looks any different after this deploy, that's a bug — send me a screenshot.

## Install

```bash
unzip -o rentflow-mobile-m3.zip -d .
cp -r patch/src  ./
rm -rf patch rentflow-mobile-m3.zip

git add -A
git commit -m "mobile(m3): modals become bottom sheets — responsive backdrop + drag handle"
git push origin design-md-changes
```

## After deploy — the moments to check on phone

1. **Tap the FAB (+) on the availability page.** The book-by-date modal should slide up from the bottom of the screen, full-width, with a small horizontal pill (handle) at the top. Round top corners, flat bottom flush with screen.
2. **Open a booking to edit it** (Residents → tap edit). BookingForm should slide up from bottom. Because it's tall and scrollable, the sheet fills nearly all the vertical space with the drag handle visible at the very top.
3. **From Maintenance, tap "بلاغ جديد".** Same sheet behavior.
4. **From Settings → Staff, tap "إضافة موظف جديد".** StaffFormModal slides up.
5. **Tap the profile picture in the header.** ProfileSettingsModal slides up.
6. **On analytics, tap a KPI card.** Breakdown modal slides up (no drag handle on this one — inline modal, less form-heavy).

**On desktop:** open the same modals. Should look **identical** to before this patch — centered, all corners rounded, no visible handle.

## What's next — the final mobile phase

**Phase M4 — the timeline views + polish**:
- **Availability** grid: sticky unit column on the trailing edge + horizontal date scroll (right now the whole grid clips on 375px)
- **Pricing** timeline: same treatment (12 months at 30px wide is unreadable)
- **PublicBookingView** (guest-facing, most likely accessed on phones) — dedicated mobile pass
- Touch target audit across remaining views

Say **"ship M4"** when ready. After M4, the mobile pass is complete — every view has been touched, every modal is a sheet, every interaction feels native.
