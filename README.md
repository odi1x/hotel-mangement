# Rent Flow — Mobile Nav FAB Morph Animation

1 file. The FAB now morphs in/out smoothly when transitioning between "primary content" tabs (with FAB visible) and "more" (no FAB).

## What changed

The FAB used to just appear/disappear instantly (`{showFAB && <button/>}`). Now it's always in the DOM but its width, margin, opacity, and scale all transition together — feels like the circle is being absorbed into the pill nav bar.

### Before

```jsx
{showFAB && (
  <button className="w-14 h-14 ...">
    <Plus />
  </button>
)}
```

Conditional render. FAB pops in/out. Nav pill snaps to new width. Jarring.

### After

```jsx
<button
  className={`h-14 rounded-full ... transition-[width,margin,opacity,transform]
              duration-[350ms] ease-[cubic-bezier(0.32,0.72,0,1)] ${
    showFAB
      ? 'w-14 mr-3 opacity-100 scale-100'
      : 'w-0 mr-0 opacity-0 scale-75 pointer-events-none'
  }`}
>
  <Plus />
</button>
```

Always rendered. The 4 animated properties:

| Property | Visible | Hidden |
|---|---|---|
| `width` | 56px | 0px |
| `margin-right` | 12px | 0px |
| `opacity` | 1 | 0 |
| `scale` | 100% | 75% |

- **Width + margin collapsing together** frees up 68px of horizontal space — the pill's `flex-1` naturally expands into it, so the pill smoothly widens as the FAB shrinks. No manual math required.
- **Opacity** fades the icon out so it doesn't sit as a visible thin sliver during the collapse.
- **Scale-75** during collapse makes the FAB feel like it's being pulled into the pill's edge rather than getting squished.
- **`overflow-hidden`** on the button keeps the `Plus` icon from spilling out when width shrinks below icon size.
- **`pointer-events-none`** when hidden means you can't accidentally tap the invisible button.
- **`aria-hidden={!showFAB}` + `tabIndex={-1}`** when hidden — proper accessibility, screen readers ignore it.

### The visual effect

**Going to More** (pressing المزيد from any primary tab):
1. FAB starts shrinking + fading + scaling down
2. Pill expands to fill the freed space (via flex-1)
3. Circle disappears into the pill's leading edge

**Going back from More** (pressing any primary tab):
1. Pill starts compressing
2. FAB grows from a small dot + fades in + scales up
3. Circle emerges from underneath the pill's leading edge

Both directions take 350ms with iOS-quality quart-out easing (`cubic-bezier(0.32, 0.72, 0, 1)`). Feels snappy but intentional — same easing curve I use for the modal `.anim-sheet` and the tab `.anim-tab` transitions.

## Files touched

- `src/components/layout/MobileBottomNav.jsx` — only file

## Install

```bash
unzip -o rentflow-nav-morph.zip -d .
cp -r patch/src  ./
rm -rf patch rentflow-nav-morph.zip

git add -A
git commit -m "mobile: FAB morph animation on nav transition"
git push origin design-md-changes
```

## After deploy — what to look at

1. On mobile, from any primary tab (Availability / Requests / Residents), tap **المزيد**.
2. Watch the "+" circle — it should shrink, fade, and scale down as the pill nav expands into its space. Feels like one continuous morph.
3. From the More menu, tap any other tab.
4. Watch the pill nav — it should compress as the FAB emerges + fades in + scales up from its leading edge.
5. Try tapping fast between tabs — the animations should interrupt gracefully (Tailwind's `transition-*` on the class change means each transition starts from wherever the previous one left off).
