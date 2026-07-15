# Rent Flow — Fix Pack #3 (bugfixes on Fix Pack #2)

Fixes two bugs I shipped in Fix Pack #2 plus one root-cause fix for the persistent white line.

## Bug 1 — Early checkout crash (white page)

**Root cause**: I destructured `{ paid, totalOwed }` from `computeBookingTotals()` in the checkout modal, but the actual function returns `{ totalDue, totalReceived, balanceDue, status, nights }`. So `paid` was `undefined`, and calling `.toLocaleString()` on it crashed React and blanked the page.

**Fix**: destructure the real names and alias them locally:
```js
const { totalDue: totalOwed, totalReceived: paid } = computeBookingTotals(bk);
```

Should have tested the modal after writing it. My bad.

## Bug 2 — Auto-refund used wrong sign convention

**Root cause**: I stored the auto-created refund with `amount: overpaid` (positive) and my own custom sum formula. But the deployed `api/payments.js` and `computeBookingTotals()` store refunds with **negative** amounts and just sum the values. Two inconsistent conventions coexisting = wrong balance calculations forever after any early-checkout refund fires.

**Fix**: match the deployed convention exactly — store amount as `-Math.abs(overpaid)` (negative), and compute `paidSoFar` as a plain sum. Now auto-refunds behave identically to manually-created refunds in the ledger.

## Bug 3 — White line still there

**Root cause I identified in the previous pack was incomplete.** Removing the header's `bg-canvas` fixed one thing, but the actual source was upstream: `<html>` and `<body>` in `index.html` are set to `bg-white` (pure white `#FFFFFF`), while the app container uses `bg-page` (near-white). Any subpixel gap between the viewport edge and the app container shows the pure-white body underneath — a visible thin line, especially at the top edge of the viewport.

**Fix**: change `<html>` and `<body>` classes from `bg-white` → `bg-page` in `index.html`. Now every layer of the DOM stack renders the same background color and there's nothing to see through.

## Install

```bash
unzip -o rentflow-fixpack-3.zip -d .
cp -r patch/index.html                       index.html
cp -r patch/api/*                            api/
cp -r patch/src/components/views/*           src/components/views/
rm -rf patch rentflow-fixpack-3.zip

git add -A
git commit -m "fix: early checkout crash + refund sign + html bg-page"
git push origin design-md-changes
```

No schema changes.

## Files changed

- `index.html` — html + body use `bg-page` (was `bg-white`)
- `api/bookings.js` — auto-refund stored with negative amount; paidSoFar computed by plain sum
- `src/components/views/ResidentsView.jsx` — destructure correct field names from `computeBookingTotals`

## After deploy — verify

1. **Early checkout with overpayment** — do a checkout that would result in a refund. Should complete without crashing. Then open the guest's payment ledger — should show the auto-refund entry as a negative amount, balance = 0.

2. **Top of any page** — the white line should be completely gone now, not just faded.

Sorry for the round trip — the payments convention thing is exactly the kind of consistency bug that only bites at integration time. Shipping the auto-refund end-to-end without opening the ledger to verify was a mistake.
