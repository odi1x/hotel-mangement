# Rent Flow — Phone number bidi/paste bug

Real bug, found the root cause. 8 files.

## What was actually happening

When you paste a phone number copied from a Contacts app, WhatsApp, or any Arabic-context source, the copied text often carries an **invisible Unicode bidi control character** — typically RLM (Right-to-Left Mark, U+200F) — embedded right alongside the digits. You can't see it, but it's there in the clipboard data.

That invisible character forces the browser's bidi (bidirectional text) algorithm to treat the surrounding content as right-to-left, which reorders the VISUAL grouping of digits and spaces — even though the actual digit sequence in memory never changed. This is why:

- **Typing** a number is fine — no bidi characters get typed, just plain digits.
- **Pasting** a number looks reversed — the hidden RLM mark comes along with the paste and gets stored into the database as part of the phone number string.
- **The corruption shows up everywhere** the number is later displayed (lists, receipts, printouts) — because the bad character is now baked into the stored string, not just a display glitch in one spot.

I confirmed this by simulating a paste with an embedded RLM character:
```
Raw (has RLM):  "‏+966 55 740 3401"   (invisible char before the +)
Sanitized:      "+966 55 740 3401"
```

I also found `BookingForm`'s phone input was missing `dir="ltr"` entirely (the public booking form had it, the admin one didn't) — a secondary contributor.

## Fix — three layers

**1. New shared utility** (`src/lib/phoneUtils.js`) — `sanitizePhone()`:
- Strips all bidi control characters (RLM, LRM, and the wider bidi-control Unicode ranges)
- Normalizes Arabic-Indic (٠-٩) and Extended Arabic-Indic (۰-۹) digits to Western digits, in case those got pasted too
- Collapses whitespace

**2. Applied on every phone INPUT** — so new data is clean going forward:
- `BookingForm.jsx` (admin/staff booking form) — was missing `dir="ltr"` too, now added
- `PublicBookingView.jsx` (public-facing booking form, most likely target for pasted numbers from a phone's contacts)

**3. Applied on every phone DISPLAY site** — so already-corrupted existing data self-heals without a database migration:
- `PrintAgreement.jsx` — the receipt/contract screenshot you showed
- `ResidentsView.jsx` — both the desktop table row and the mobile card (the mobile card screenshot you showed)
- `BalancesView.jsx`
- `RequestsView.jsx` (already had `dir="ltr"`, added sanitizer for defense-in-depth)
- `AvailabilityView.jsx` (same — already had `dir="ltr"`, added sanitizer)

Because the sanitizer is idempotent (running it twice gives the same result), it's safe to apply on every render without any performance concern or risk of double-processing.

## Files touched (8)

- `src/lib/phoneUtils.js` — new utility
- `src/components/ui/BookingForm.jsx` — input fix + dir=ltr
- `src/components/ui/PrintAgreement.jsx` — display fix
- `src/components/views/PublicBookingView.jsx` — input fix
- `src/components/views/ResidentsView.jsx` — display fix (2 spots)
- `src/components/views/BalancesView.jsx` — display fix
- `src/components/views/RequestsView.jsx` — display fix
- `src/components/views/AvailabilityView.jsx` — display fix

## Install

```bash
unzip -o rentflow-phone-fix.zip -d .
cp -r patch/. .
rm -rf patch rentflow-phone-fix.zip

git add -A
git commit -m "fix: phone number bidi corruption on paste — strip invisible RLM/bidi chars, normalize Arabic-Indic digits"
git push origin design-md-changes
```

## Verify

1. **The specific bug you showed:** find that same booking (مسفر محمد مصفر التليدي) — it should now display correctly wherever you see it (Residents list, Balances, printed receipt) since the display-side sanitizer self-heals the already-corrupted stored value.
2. **New paste test:** copy a phone number from your phone's Contacts app (the kind that triggered this originally) and paste it into the phone field when creating a new booking. It should now display correctly, both in the form and afterward in every list/receipt.
3. **Typing still works:** typing a number manually should look exactly the same as before — no regression there.

## One thing worth knowing

This fix cleans up the DISPLAY everywhere, but it does NOT retroactively rewrite the corrupted value in the database — it just cleans it every time it's rendered. If you want the database itself cleaned (so raw exports/backups also have clean numbers), that would need a one-time migration script. Let me know if you want that — it's a quick script to write given the sanitizer already exists.
