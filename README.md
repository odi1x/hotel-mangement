# Rent Flow — Mobile Follow-up: Apartments + Public Booking + Turnstile

4 files. All four things you flagged.

## What changed

### 1. Apartments tab — scroll scrim added

Missed this in the impeccable pass — Apartments tab's scroll container didn't have the gradient scrim. Now it does. Also added `pb-24 md:pb-0` safe-area padding so the last row of apartment cards clears the floating bottom nav.

### 2. Public booking header — safe-area padding to fix iOS clipping

**The bug**: the sticky header was getting clipped at the top on iOS Safari because iOS's notch/status bar area (safe-area-inset-top) was overlapping with the header content. The business name was rendering partially behind the status bar.

**Fix**: replaced `py-3 md:py-4` with `paddingTop: 'max(0.75rem, env(safe-area-inset-top))'` inline style. On phones with a notch, the header now has enough top padding to clear the status bar. Older phones without a notch fall back to the 12px minimum.

Also added a **gradient scrim below the sticky header** — same iOS-style pattern as the app. Implemented as a `::after` pseudo-element (`after:absolute after:top-full after:h-4 after:bg-gradient-to-b after:from-canvas after:to-transparent`) so content scrolling under the header fades classy.

### 3. Removed the redundant image-icon button on apartment cards

The apartment card had two buttons at the bottom:
- Small image-icon button → opened the photo gallery
- Full "حجز الوحدة" button → went to booking form

Your point was right: **tapping the card itself already opens the gallery**, so the extra image button is redundant. Removed it. The "حجز الوحدة" button now takes full width, cleaner visual hierarchy.

### 4. Cloudflare Turnstile — configurable via env vars

**The bug**: the "For testing only. If seen, report to site owner" banner was showing because both the site key (client) and the secret key (server) were hardcoded to Cloudflare's public test values. Those test keys always succeed but display the warning banner.

**Fix**: both keys are now env vars:
- **Client** (`PublicBookingView.jsx`): `import.meta.env.VITE_TURNSTILE_SITE_KEY` with fallback to the test key
- **Server** (`api/public.js`): `process.env.TURNSTILE_SECRET_KEY` with fallback to the test secret

**To get rid of the testing banner in production**, add these two env vars in Vercel:

```
VITE_TURNSTILE_SITE_KEY=<your real site key from Cloudflare>
TURNSTILE_SECRET_KEY=<your real secret key from Cloudflare>
```

How to get keys: Cloudflare Dashboard → Turnstile → Add site → choose "managed challenge" mode → copy the site key + secret key.

If you don't set them, the app keeps working with the test keys and just shows the warning banner (no functionality lost, just visual polish).

## Files touched

- `src/components/views/ApartmentsView.jsx` — scroll-scrim + safe-area padding
- `src/components/views/PublicBookingView.jsx` — safe-area header + gradient scrim + removed image button + env var Turnstile key
- `api/public.js` — env var TURNSTILE_SECRET_KEY

## Install

```bash
unzip -o rentflow-mobile-followup2.zip -d .
cp -r patch/api  ./
cp -r patch/src  ./
rm -rf patch rentflow-mobile-followup2.zip

git add -A
git commit -m "mobile followup: apartments scrim + public booking safe-area + turnstile env vars + remove redundant image button"
git push origin design-md-changes
```

## After deploy — the moments to check

1. **Apartments tab on phone** — scroll should now show the gradient fade at the top like other views.
2. **Open the public booking link on your phone** (`/book/<your-id>`).
   - Header should sit fully below the notch/status bar, no clipping.
   - As you scroll the apartment list, content should fade into the header (subtle gradient just below the sticky header).
   - Each apartment card should have only the "حجز الوحدة" button — no separate image button.
3. **Go through the booking flow to the Turnstile step** — if you haven't set the env vars yet, you'll still see the "For testing only" banner (that's expected until you add the real keys).

## After you add the real Cloudflare keys

1. Cloudflare Dashboard → Turnstile → your site → get keys
2. Vercel → your project → Settings → Environment Variables → add:
   - `VITE_TURNSTILE_SITE_KEY` = site key
   - `TURNSTILE_SECRET_KEY` = secret key
3. Redeploy (Vercel auto-redeploys on env change if configured)
4. Test the booking flow — no more "testing only" banner, real bot protection active.
