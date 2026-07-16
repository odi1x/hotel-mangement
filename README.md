# Rent Flow — Design System Phase 3: Polish

**Scope**: 3 files. The visible design pass.

Phases 1 and 2 were structural. This is where design boldness actually lives — the one hero moment on the analytics screen, the brand corner on the sidebar, and the utility infrastructure for future modal consistency.

## What changed

### 1. Analytics KPI hierarchy — one primary, three supporting

**Before**: four undifferentiated tiles in a 4-column grid, revenue and profit both using the emerald accent (spreading the scarce color thin), all reading as visual peers.

**After**: **صافي الأرباح (Net Profit)** promoted to a hero tile — the one number that actually captures whether the business is winning:
- Full-width card at the top
- Number is `text-5xl` on desktop (`text-4xl` on mobile), tighter tracking, tabular numerals
- Only place on the whole screen that uses the emerald accent for the number
- Signature accent bar on the leading (right, RTL) edge — small brand touch
- Subtitle explains what "صافي" actually means (revenue minus all expenses)

Below the hero, three supporting metrics in a strict 3-column grid:
- إجمالي الإيرادات (Total Revenue) — was accent, now ink
- معدل الإشغال (Occupancy Rate)
- الليالي المؤجرة (Nights Rented)

Same clickable behavior (each opens the breakdown modal). Smaller number (`text-2xl` instead of `text-3xl`) to make the hero feel taller. All four still use tabular numerals for aligned display of digits.

Why Net Profit and not Revenue as the hero: revenue is easy — anyone can generate revenue by dropping prices. Net Profit is what actually pays the bills, and it's the number owners intuitively check first thing in the morning. Making it primary teaches good habits. If you want Revenue as the hero instead, it's a 3-line swap in AnalyticsView.jsx.

### 2. Sidebar wordmark — a real brand corner

**Before**: generic Home icon + wordmark in `font-semibold`, `tracking-tight`, followed by `mb-10` of dead space before the nav.

**After**:
- Wordmark now uses `font-bold tracking-tightest leading-none` — reads as a logo, not a nav item
- The block is followed by a hairline-soft border-bottom that creates a "chapter" break between brand identity and navigation
- Slightly reduced padding (`mb-6 pb-6` instead of `mb-10`) — the divider does the separation work now, so no wasted whitespace
- Icon slightly smaller (22 instead of 24) to balance with the tighter wordmark

The effect: the top-right corner of the app now feels like "you are here" instead of "here's some space then the nav starts".

### 3. Sidebar active state — drop the redundant tint

**Before**: an active nav item had SIX signals of activation stacked on top of each other:
1. Background color change (`bg-surface-card`)
2. Text color change (`text-ink` vs `muted`)
3. Font weight change (`font-semibold` vs default)
4. Accent bar on the leading edge (`bg-accent`)
5. Icon tint change (`text-accent`)
6. Icon stroke-width bump (`strokeWidth={2.25}` vs `2`)

Six signals for "this is the current page" is over-emphasis. When everything's shouting, nothing's heard.

**After**: dropped the icon accent tint. The accent bar is doing that job already, and having them both was double-emphasizing the same thing. The remaining signals (bg, text color, font weight, bar, stroke width) still make the active state unmistakable — they just each contribute a different kind of emphasis (layout / hierarchy / brand / weight).

### 4. Modal utility classes (infrastructure, no adoption yet)

Added seven composable utility classes to `index.css` for future modal migrations:

```
.modal-backdrop  — the fixed backdrop that covers the viewport
.modal-shell     — the actual dialog box (add max-w-* per instance)
.modal-header    — px-6 py-4, hairline-soft bottom border
.modal-body      — flex-1, overflow-y-auto, p-6
.modal-footer    — px-6 py-4, hairline-soft top border
.modal-title     — text-lg font-semibold tracking-tight
.modal-subtitle  — text-xs muted
```

Also added `.eyebrow` for the uppercase micro-labels used everywhere:
```
.eyebrow — text-2xs font-semibold uppercase tracking-wider text-muted
```

These are available now. When any modal is next edited for a bug or feature reason, migrate it to the utility classes as part of that work. That's a lower-risk way to migrate ~12 modals than doing it all at once.

## What I deliberately deferred

Two items from the plan I chose not to do in this pass:

**1. Font-weight rebalance across the whole app.** I did rebalance the analytics KPI cards specifically (the eyebrow labels drop from `font-semibold` to `.eyebrow`'s baked-in weight, which is still 600 but semantic). But I didn't sweep 192 uses of `font-semibold` across every view because that's high-risk work — some are correct, some are overuse, and only visual inspection can tell them apart. Better to fix them as I encounter them in other work.

**2. Padding standardization.** Same reason — it's per-component judgment. Modals I touch in future will use the new `.modal-*` classes which enforce the "comfortable" density (p-6). Cards will migrate naturally over time.

Doing these two properly means walking through every screen with fresh eyes — that's a next quarter thing, not a "ship this patch" thing.

## Install

```bash
unzip -o rentflow-design-phase-3.zip -d .
cp -r patch/src  ./
rm -rf patch rentflow-design-phase-3.zip

git add -A
git commit -m "design(phase 3): analytics KPI hierarchy + sidebar brand corner + modal utilities"
git push origin design-md-changes
```

Three files touched: `src/index.css`, `src/components/layout/Sidebar.jsx`, `src/components/views/AnalyticsView.jsx`.

## After deploy — the moments to look at

- **Open analytics.** The eye should land on the profit number immediately, then drift down to the three supporting metrics. If it feels like your gaze bounces around not knowing where to land, hierarchy failed and I need to know.
- **Look at the sidebar.** The wordmark corner should read as a small brand statement. The active nav item should feel emphasized but not screamed at.
- **Navigate between tabs.** Watch the active-state transitions on the sidebar items. They should feel calmer than before — the accent bar carries the "current" signal and the icon just... follows the text.

## What's not shipped and why

The KPI redesign is the one aesthetic bet in this pass. If it doesn't land, it's a 20-line revert (delete the new hero div, restore the 4-card grid). The other changes (sidebar wordmark, active-state cleanup, utility classes) are lower-stakes — they're refinement, not reimagination.

If you want to keep pushing on the design later:
- **Fixed-width sidebar in expanded mode** — the current `w-64` is fine but could be `w-60` for a slightly tighter feel
- **Chart card treatment on analytics** — the revenue trend chart currently has the same visual weight as the KPI cards; could be quieter
- **Empty states across the app** — most views have decent empty states from my Feature 1 patches, but there are older screens where empty is just... white space
- **Print styles for the receipt/agreement PDFs** — those still use the old inline hex values and could benefit from the token system in a future pass

Say the word if you want any of those.
