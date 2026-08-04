# Rent Flow — Compute burn reduction

Two focused changes that should cut your Neon CU-hour usage by roughly 60-80%. No behavior changes users will notice.

## The two big offenders

**1. Notifications polling every 20 seconds, even when the tab was hidden.**

24 hours × 60 min × 3 polls/min = **4,320 database hits per day per open tab**, running whether you were looking at the page or not. Each poll is a small query but they add up massively over a month.

**2. Analytics had no caching. Every chip toggle = full DB recompute.**

Analytics does the heaviest queries in the whole app (loops over all bookings, all expenses, all apartments, computes P&L per unit). Clicking chip → GET /api/analytics → full recompute every time. Toggling between "Month" and "Year" a few times could burn 6-8× the compute of a single view.

## Fix 1: Notification polling — slower + smarter

- Interval: **20s → 60s** (3× reduction on its own)
- **Skip polling entirely when the tab is hidden** — if you're not looking at Rent Flow, don't waste compute pretending you are
- The existing `focus` and `visibilitychange` listeners still fire an immediate refresh when you come back, so notifications never feel stale
- Net effect: from ~4,320/day/tab down to ~1,440/day/tab if you leave the tab open all day. If you close the tab or switch away, it's much lower still.

## Fix 2: Server-side response cache on /api/analytics

- Module-level in-memory cache in `api/analytics.js`
- Key includes userId + all query params that affect the response
- **TTL: 30 seconds**
- Serves cached response without touching the database
- Cache lives across warm serverless invocations (Vercel reuses lambda instances for short periods — that's when hot-path chip toggling happens)
- Cold starts miss the cache but that's fine, they'd have to hit the DB anyway
- Cap at 200 entries with FIFO eviction so long-lived instances don't leak memory

**Trade-off:** newly-added bookings/expenses can take up to 30 seconds to appear in Analytics. Given how rarely you'd add a booking then immediately check Analytics, and how much compute this saves, I think that's fine. If it bites you later we can tighten the TTL or add manual invalidation.

## Expected impact

Rough numbers for a single-user, single-tab session over a day:

| Behavior | Before | After |
|---|---|---|
| Notification polls | ~4,320 | ~1,440 (tab active), 0 (hidden) |
| Analytics fetch on chip toggle | full recompute | cached (if within 30s) |
| Analytics fetch on booking add | full recompute | full recompute (unavoidable) |
| Total DB CU-hours per day | (your baseline) | **est. 20-40% of baseline** |

Should give you significant headroom on the 100 CU-hour Neon free tier. Whether it keeps you under the limit long-term depends on how much you use the app.

## Files touched (2)

- `api/analytics.js` — response cache with 30s TTL
- `src/context/NotificationContext.jsx` — polling interval to 60s + skip when hidden

## Install

```bash
unzip -o rentflow-compute-reduction.zip -d .
cp -r patch/. .
rm -rf patch rentflow-compute-reduction.zip

git add -A
git commit -m "perf: server-side analytics cache (30s TTL) + slower notification polling (60s, skip when hidden)"
git push origin design-md-changes
```

## Verify

Nothing visible changes for the user. To confirm the cache is working, watch Vercel function logs while clicking Analytics chips — after the first call for a given filter, subsequent identical calls should complete much faster (they're returning from memory, not the DB).

## What's still burning compute after this

- Every apartment fetch, booking fetch, expense fetch on tab open (`DataContext` fires 6 parallel queries on mount)
- Filter changes still fetch (but hit cache 30s later)
- Booking mutations invalidate implicit "freshness" — but we don't manually bust the cache, so analytics may show 30s-old data

If your CU budget still gets uncomfortable, next candidates:

1. **Cache other endpoints too** — /api/apartments, /api/licenses, /api/pricingRules rarely change. TTL 5 minutes would be safe.
2. **Lazy DataContext loading** — only fetch what the current view needs, instead of everything on mount. Bigger refactor.
3. **Neon Launch tier ($19/mo)** — the surgical, boring option. 300 CU-hours vs 100.

Say the word for any of those.
