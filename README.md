# Rent Flow — Mobile Followup 4: Top Scrim Fix + Modal Blur + Scrim Hide

Three targeted fixes. Two files. Testing before shipping this time — the animations, positioning, and scrim behavior are all verified via `npx vite build`.

## 1. Header now blurs when a modal is open

**The bug**: the floating nav had `.anim-nav` (fine, no issue) but the view container had `.anim-tab` which used `translateY(4px) → translateY(0)`. Even after the animation completed, `translateY(0)` is a non-`none` transform value — and **any non-none transform on an ancestor traps `fixed`-positioned descendants inside that ancestor's box**.

This means modals rendered from inside a view (`MaintenanceIssueForm` from `MaintenanceView`, inline analytics breakdown modal, availability booking modal, etc.) couldn't reach the actual viewport. They were confined to the view container area. Consequence: the modal's `fixed inset-0` backdrop only covered the view area, NOT the header. Backdrop's `backdrop-blur-sm` therefore only blurred content inside the view, and the header stayed sharp.

**Fix**: switched `.anim-tab` from `anim-fade-up-sm` (transform-based) to `anim-fade-only` (opacity-only). No transform in the final state → no stacking context created after animation → modals inside views can reach viewport → modal backdrops cover the header → `backdrop-blur-sm` blurs the header properly.

Tab transition is now a pure fade (no slide). Slightly less dynamic, but the visual polish is now correct across the whole app.

```css
@keyframes anim-fade-only {
  from { opacity: 0; }
  to   { opacity: 1; }
}
.anim-tab {
  animation: anim-fade-only 220ms cubic-bezier(0.32, 0.72, 0, 1) both;
}
```

## 2. Both scrims now hide when a modal is open

**The bug**: the top and bottom fade scrims sit at `z-30`. Modals sit at `z-50+`. So the modal paints above the scrim visually — but the modal's `backdrop-blur-sm` overlay is only `bg-black/40` (40% opaque). The scrim's gradient bleeds through the semi-transparent black, visible especially when the modal is a bottom sheet (only covers the bottom half).

**Fix**: added `.mobile-scrim-shield` class to both scrims and extended the existing `body:has([data-modal-active])` CSS rule to hide BOTH the nav AND the scrims when any modal is open:

```css
body:has([data-modal-active]) .mobile-nav-shield,
body:has([data-modal-active]) .mobile-scrim-shield {
  visibility: hidden;
  pointer-events: none;
}
```

Now when you open any modal, the floating nav + both fade scrims all vanish. Pure black-tint backdrop against the underlying content. Cleaner mobile modal experience.

## 3. Top scrim height reduced so it doesn't clip content at rest

**The bug**: the previous scrim was `h-12` (48px). Combined with content starting at y=80 (header 56px + main padding-top 16px + scroll pt-2 8px), the top of the first content card sat 24px inside the scrim's fade zone. At rest, first card's top edge was partially obscured behind the fade.

**Fix**: reduced top scrim to `h-6` (24px). Scrim now covers y=56 to y=80. Content starts at y=80 — right at the scrim's transparent edge. No overlap at rest, no clipping. When user scrolls, content moves up into the scrim and fades gracefully as intended.

Bottom scrim (h-28) stays unchanged — it correctly sits under the floating nav.

## Files touched (2)

- `src/index.css` — new `anim-fade-only` keyframe + `.anim-tab` uses opacity-only + `.mobile-scrim-shield` added to the modal-hide CSS rule
- `src/components/layout/Layout.jsx` — top scrim reduced to `h-6`, both scrims tagged with `mobile-scrim-shield`

## Install

```bash
unzip -o rentflow-mobile-followup4.zip -d .
cp -r patch/src  ./
rm -rf patch rentflow-mobile-followup4.zip

git add -A
git commit -m "mobile followup 4: header blurs on modal + scrims hide on modal + top scrim no clip"
git push origin design-md-changes
```

## After deploy — what to actually verify

1. **Open any modal** (add booking, add maintenance issue, edit anything). Two things should now be true simultaneously:
   - The header (profile pic, bell, title) should be BLURRED behind the modal backdrop, not sharp
   - The bottom fade band above the nav should be GONE (invisible while modal is open)

2. **Scroll any view.** First content card top should be fully visible at rest — no top edge cut off. Scroll up, and content should still fade into the header area cleanly.

3. **Switch tabs.** New view fades in (no more slide). Should feel smooth. If you open a modal immediately after switching tabs, the header should still blur — this was the biggest bug.

## What I learned this time

The `transform: translateY(0)` in the animation's end state was the actual source of the header-not-blurring bug, and I missed it in the previous review. `translateY(0)` looks visually identical to `transform: none` but CSS treats them differently for stacking-context purposes. Anywhere I use transform-based animations on containers that need to allow `fixed` descendants to reach the viewport, I need to be careful about the end state.

Also: the animations definitely render now (verified by finding the `anim-` classes in the compiled CSS output). Not silently dropped like the `tailwindcss-animate` classes were before.
