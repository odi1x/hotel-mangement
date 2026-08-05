# Rent Flow — Cleaning R5: staff must-check gate + mobile polish

Two things. Two files.

## 1. Staff can't finish with unchecked boxes

Admin still one-clicks Finish regardless of checked state (they may be closing out for a cleaner who forgot to tick, or handling edge cases — the admin knows what they're doing).

Staff now MUST check every item before finishing. If they tap the Finish button with any item unchecked:

- **The unchecked items shake.** Small horizontal wobble, 400ms × 2 iterations. No color change — the shake alone signals "check this first," fitting the app's restrained palette (no red warnings anywhere).
- The task does NOT complete.
- Repeated Finish taps re-trigger the shake (via a nonce that force-remounts unchecked items to restart the animation).
- Once all items are checked, the Finish tap succeeds and the modal closes normally.

Implementation: a small `blinkNonce` state gets bumped on each blocked attempt. Unchecked items include the nonce in their React `key` — so they remount when the nonce changes, restarting the CSS animation cleanly. Checked items keep a stable key (no remount, no shake).

The `anim-attention-shake` keyframe was added to `src/index.css` following the codebase's existing `anim-*` utility convention. Respects `prefers-reduced-motion` (no animation for users who opted out).

## 2. Mobile polish for the Cleaning tab

Not a redesign — targeted fixes for the phone experience:

**Task detail modal (bottom sheet on mobile):**
- Added a **grab handle** (small horizontal bar at top) — subtle visual cue this is a dismissible bottom-sheet, not a full-screen page.
- **Max height 92vh** on mobile so long checklists don't push the sheet past the viewport.
- **Safe-area padding** on the bottom action bar (`env(safe-area-inset-bottom)`) so the Finish button clears the iPhone home indicator instead of sitting behind it.
- **Slightly tighter header padding** on mobile (`p-4` vs desktop `p-5`).

**Area grid inside the modal:**
- **Tighter padding + gaps** on mobile (`p-1.5 gap-1.5`) vs desktop (`p-2.5 gap-2`). Same 4-column layout but tiles no longer feel cramped on 360px viewports.
- **Minimum tile height `min-h-16` (64px)** so tap targets stay comfortable.
- **`active:scale-[0.97]`** — subtle press-in feedback on tap. Small but makes the grid feel like something you're physically pressing.
- **10px label text on mobile** (`text-[10px]`) so labels like "غرفة النوم" and "تجديد المستلزمات" don't wrap or truncate.

**Task rows in the list:**
- **`active:bg-*`** state for touch feedback (was hover-only).
- **`md:p-3.5`** — slightly more padding on desktop, unchanged on mobile.

**Add-task modal:**
- Also converted to proper bottom-sheet with grab handle + safe-area padding.
- Now uses `anim-sheet` (mobile-appropriate slide-up + desktop zoom) instead of `anim-dropdown`.

**Modal shell (both):**
- Swapped `anim-dropdown` for `anim-sheet` — the existing utility that's already tuned for bottom-sheet slide-up on mobile and centered zoom on desktop. Same visual result on desktop, more natural feel on mobile.

## Files touched (2)

- `src/index.css` — added `anim-attention-shake` keyframe + `.anim-attention` class
- `src/components/views/CleaningView.jsx` — blink logic, mobile polish

## Install

```bash
unzip -o rentflow-cleaning-r5.zip -d .
cp -r patch/. .
rm -rf patch rentflow-cleaning-r5.zip

git add -A
git commit -m "cleaning r5: staff must-check gate with shake feedback, mobile polish"
git push origin design-md-changes
```

## Verify

**Staff must-check flow:**
1. Log in as staff (or admin — same UI, admin bypasses the block).
2. Open a task with a non-empty checklist, some boxes unchecked.
3. Tap Finish → unchecked items shake. Modal stays open. Nothing saved.
4. Check the remaining items.
5. Tap Finish → task completes and modal closes.

**Admin bypass:**
1. Log in as admin, open same kind of task.
2. Tap Finish with unchecked items → task completes anyway. Modal closes.

**Mobile:**
1. Open the Cleaning tab on your phone.
2. Tap a task → bottom-sheet slides up with a grab handle.
3. The 8-tile area grid fits comfortably; labels aren't cropped.
4. Bottom Finish button clears the iPhone home indicator.
5. Tapping the Finish button (with something unchecked, as staff) makes the unchecked items shake.
6. All motion respects your system's Reduce Motion setting.

## Design notes

I stuck to the existing token system rather than introducing new colors or type treatments. The shake animation uses no color at all — it's motion-only, matching the app's restraint. Everything follows the same `anim-*` naming convention already used for `.anim-tab`, `.anim-nav`, `.anim-sheet`, `.anim-dropdown`.

The one aesthetic risk was the shake pattern itself: shakes are common in error/rejection UX but usually loud and short. This one is deliberately subtle — 3px displacement across 800ms total — matching the app's overall quiet feel. It communicates "check this first" without pretending something's broken.
