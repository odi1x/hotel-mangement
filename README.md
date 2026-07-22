# Rent Flow — Mobile Followup 5: Analytics Modal Portal + Share Link Redesign

Two things. Small patch. **Building actually verified** this time.

## 1. Analytics breakdown modal now properly covers the header

**The bug**: even after removing the transform from `.anim-tab` last patch, the analytics breakdown modal still doesn't blur the header. Something in the ancestor tree (view container, AnalyticsView's own wrappers, or an implicit browser behavior around `overflow-hidden` on iOS) is still trapping the `fixed` positioning.

**Fix**: portaled the breakdown modal to `document.body` using React's `createPortal`. When it renders, it goes straight to the root of the document — no ancestor stacking context can trap it. Its `fixed inset-0 z-[100]` reaches the actual viewport, backdrop covers the header, `backdrop-blur-sm` applies to the header, header goes blurry. Same behavior as the editing modals in Availability that you said work correctly.

This is the same technique I used for the notification/profile dropdowns earlier. Portals are the robust fix for "why isn't my fixed element behaving like it should" — they bypass every ancestor issue.

## 2. Redesigned the share link — from ugly card to clean icon button + modal

The old inline card (`رابط الحجز المباشر للعملاء`) had:
- A colored icon box on one side
- A subtitle
- A readonly input with the URL
- A copy button

All crammed into a tight horizontal card that dominated whatever toolbar it lived in. You were right — it was ugly.

**New design**:

1. **Toolbar** (desktop and mobile) now shows a single clean button:
   ```
   [🔗 مشاركة الرابط]     (desktop)
   [🔗 مشاركة رابط الحجز] (mobile)
   ```
   Icon + label, matches the rest of the app's button design language, no visual weight fighting with other elements.

2. **Clicking it** opens a new `ShareLinkModal` component — bottom sheet on mobile, centered dialog on desktop. Contents:
   - Header row: icon + title "رابط الحجز المباشر" + subtitle "شارك هذا الرابط مع عملائك" + close button
   - URL displayed in a code-style card (monospace, easy to select/read) with a small "الرابط" eyebrow above it
   - **Primary action**: full-width "نسخ الرابط" button. Turns green ("تم النسخ" with check icon) for 2.5 seconds after copy
   - **Secondary actions row**:
     - "مشاركة" via native Web Share API on supported mobile browsers (falls back to hidden on desktop / older browsers)
     - "معاينة" opens the link in a new tab so you can see what customers see
   - Helper text at the bottom explaining what customers can do

The modal itself uses `createPortal` to render at document.body — same pattern as the breakdown modal fix above. Header blurs correctly, works on both mobile bottom-sheet and desktop centered layouts.

## Files touched (4)

- `src/components/ui/ShareLinkModal.jsx` — new (140 lines, replaces the inline card)
- `src/components/layout/Layout.jsx` — desktop toolbar: inline card → icon button. State: `isCopied/handleCopyLink` → `isShareOpen`. Import ShareLinkModal + render at root
- `src/components/views/ApartmentsView.jsx` — mobile card at top → icon button. Same state simplification. Import + render ShareLinkModal
- `src/components/views/AnalyticsView.jsx` — breakdown modal wrapped in `createPortal(..., document.body)`

## Install

```bash
unzip -o rentflow-mobile-followup5.zip -d .
cp -r patch/src  ./
rm -rf patch rentflow-mobile-followup5.zip

git add -A
git commit -m "mobile followup 5: portal analytics breakdown modal + redesigned share link"
git push origin design-md-changes
```

## After deploy — what to verify

1. **Analytics** → tap any KPI card that opens a breakdown (revenue, profit, occupancy, nights). The breakdown modal should slide up as a bottom sheet, AND the header (profile pic, bell, "تحليلات الأداء") should be blurred behind the backdrop, matching how the availability edit modals work.

2. **Apartments tab** → look at the toolbar. On desktop you should see a "مشاركة الرابط" button next to "حجز جديد". On mobile, the same button but stacked above the grid. Tapping it opens the redesigned share modal.

3. **Inside the share modal** → the URL should be visible in a code-style card, the copy button should turn green + show a check when clicked, and on mobile browsers you should see a native "مشاركة" button that triggers the Web Share sheet (iOS/Android system share).

## What's still on my list

Nothing that's actively broken as far as I know. If specific things still look off in your usage, tell me exactly which screen + interaction. The mobile pass is functionally done — this cleanup is just polish on top.
