# Rent Flow — Print red text + mobile modal width + payment tab mobile layout

Three fixes. Six files.

## 1. المبلغ المتبقي now always red on the printed receipt

Was conditionally black when the balance was fully paid (0 remaining), red only when there was an outstanding amount. Now always red regardless of the amount, per your request.

## 2. Delete confirmation modals not using full width on mobile

**Root cause:** four confirm-delete modals (Residents, Maintenance, Pricing, Expenses) all had the same bug — the outer wrapper correctly set up a mobile bottom-sheet layout (`items-end`, no horizontal padding), but the modal box itself was capped with `max-w-sm` (384px) **unconditionally**, even on mobile. Since `max-w-sm` applied regardless of screen size, on phones with any viewport width the box would center itself with dead space on both sides instead of stretching edge-to-edge like a proper bottom sheet.

**Fix:** changed `max-w-sm` → `md:max-w-sm` in all four spots — the width cap now only applies on desktop (≥768px), where it becomes a small centered dialog. On mobile it's a full-width bottom sheet, matching the pattern used everywhere else in the app (Cleaning task modal, Add Task modal, etc.).

I swept the whole codebase for this exact class combination afterward and confirmed no other instances remain.

## 3. Payment tab resident info — mobile layout cleanup

Two things were cramped on narrow screens:

**A) Header text.** The resident name and apartment name were joined on one line with a "·" separator (`{residentName} · {apartmentName}`), with no `truncate` and no `min-w-0` on the flex container — so a longer resident name could overflow past the close button or wrap awkwardly, especially combined with the icon block on the left.

Fixed: on mobile, resident name and apartment now stack on **separate lines**, each independently truncated. On desktop (≥640px, `sm:`) they go back to the compact single-line dot-separated version since there's more room there.

**B) The three-column totals strip** (إجمالي الحجز / المدفوع / المتبقّي). `text-2xl` bold numbers in three tight `p-5` columns left very little room per column on a 360-390px phone — the amount + "ر.س" suffix could wrap, and the payment-status badge below the remaining-amount column got squeezed.

Fixed: reduced padding and font size on mobile only (`p-3` vs `p-5`, `text-base` vs `text-2xl`, smaller labels), full size restored at `md:` breakpoint. Numbers, currency suffix, and the status badge now fit comfortably without wrapping.

## Files touched (6)

- `src/components/ui/PrintAgreement.jsx` — red remaining-amount
- `src/components/ui/PaymentLedgerModal.jsx` — mobile header + totals-strip layout
- `src/components/views/ResidentsView.jsx` — delete-confirm width
- `src/components/views/MaintenanceView.jsx` — delete-confirm width
- `src/components/views/PricingView.jsx` — delete-confirm width
- `src/components/views/ExpensesView.jsx` — delete-confirm width

## Install

```bash
unzip -o rentflow-print-mobile-fixes.zip -d .
cp -r patch/. .
rm -rf patch rentflow-print-mobile-fixes.zip

git add -A
git commit -m "fix: red remaining-amount in print, mobile delete-confirm full-width, payment tab mobile layout cleanup"
git push origin design-md-changes
```

## Verify

1. **Print:** generate a receipt (سند قبض) for any booking — المبلغ المتبقي should show in red regardless of whether it's 0 or has an outstanding amount.
2. **Delete confirmations on mobile:** try deleting a resident, a maintenance report, a pricing rule, and an expense — each confirm dialog should now stretch edge-to-edge as a proper bottom sheet, not float as a narrow box with gaps on both sides.
3. **Payment tab on mobile:** open the payment ledger for any booking on your phone — resident name and apartment should each sit on their own line without overflowing, and the three totals (Total / Paid / Remaining) should fit cleanly without the numbers or currency label wrapping.
