# Rent Flow — Print fixes: app header leaking into print + missing paid/due on receipt

Two bugs. Two files.

## 1. App header (profile, notification bell) showing up in print

**Root cause:** `PrintAgreement` renders as `position: fixed inset-0` — visually this covers the whole browser window, so it LOOKS like the only thing on screen. But `window.print()` doesn't respect visual layering. The browser's print engine walks the entire DOM (Sidebar, Header, bottom nav, everything), and fixed positioning collapses to normal document flow during print layout unless explicitly told otherwise. Since `PrintAgreement` isn't portaled out of the component tree, it prints alongside — not instead of — the rest of the app chrome.

**Fix — standard "print only this element" pattern:**

Added a global print rule to `src/index.css`:

```css
@media print {
  body * { visibility: hidden; }
  .print-root, .print-root * { visibility: visible; }
  .print-root { position: absolute; inset: 0; z-index: 9999; }
}
```

This hides everything by default when printing, then explicitly re-shows only the element marked `.print-root` and its children. `PrintAgreement`'s outermost div now carries this class.

Result: only the actual document (رنت فلو header, contract/receipt body, signature lines) shows up in the print output — no more profile picture, notification bell, or sidebar bleeding into the printed page.

## 2. Paid/remaining amount missing from receipts

**Root cause:** `PrintAgreement` computed a purely theoretical total (`pricePerNight × nights + tax`) but never looked at `booking.payments` at all. So the receipt showed what the customer *owed* in total, but never what they'd actually *paid* or what's *still outstanding* — which is the entire point of a "سند قبض" (receipt).

**Fix:** imported the same `computeBookingTotals` helper the rest of the app already uses (Balances view, Payment Ledger modal) — so the numbers are guaranteed consistent with what you see everywhere else in the app. Added a new section, **رابعاً: حالة السداد** (Payment Status), shown only on receipt/financial-report documents (`documentType === 'voucher'`) — the rental agreement/confirmation document doesn't need this since it's a contract, not a receipt.

The new section shows three figures:
- **المبلغ المدفوع** (Amount Paid) — sum of all payment records
- **المبلغ المتبقي** (Amount Remaining) — in red if > 0, otherwise the normal ink color
- **حالة السداد** (Payment Status) — مسدد بالكامل / سداد جزئي / غير مسدد

## Files touched (2)

- `src/index.css` — global print isolation rule
- `src/components/ui/PrintAgreement.jsx` — print-root class + payment status section

## Install

```bash
unzip -o rentflow-print-fix.zip -d .
cp -r patch/. .
rm -rf patch rentflow-print-fix.zip

git add -A
git commit -m "fix: print isolation (hide app chrome) + restore paid/due section on receipts"
git push origin design-md-changes
```

## Verify

1. **Print isolation:** open any receipt or contract from Residents view → print. The printed page (or Save-as-PDF preview) should show ONLY the document — no profile picture, no bell icon, no sidebar.
2. **Receipt payment status:** open a booking that has SOME but not all payments recorded → generate the "سند قبض / تقرير مالي" (voucher) document. You should now see a "رابعاً: حالة السداد" section showing amount paid, amount remaining, and status.
3. **Contract unaffected:** the rental agreement/confirmation document (not the voucher) should look the same as before — no payment section there, since it's not meant to be a receipt.
