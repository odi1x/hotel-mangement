# Rent Flow — Fix Pack #2

Three changes:

1. **Early checkout auto-refund** — connects the checkout modal to the payments ledger
2. **Enhanced checkout modal** — shows paid amount, nights stayed, live refund preview
3. **White line at top of page** — killed by making the header transparent

## 1. Early checkout ↔ refund payment

Before:
- User picks "تعديل المبلغ بناءً على الأيام" → totalPrice reduces → balance goes negative if guest overpaid → user has to manually go to payments tab and create an استرداد entry. Easy to forget.

After:
- Same action, but on the backend, `api/bookings.js` checks if the guest's paid amount now exceeds the new total. If yes, it auto-creates a `Payment` record with `type='refund'` and `amount = paid − newTotal`, notes it as "استرداد تلقائي عند المغادرة المبكرة". Ledger stays clean, no manual step.

Only fires on the "تعديل" option — "الاحتفاظ بالمبلغ كامل" is unchanged (guest keeps owing what they owed, or nothing changes if fully paid).

## 2. Enhanced checkout modal

The modal now shows three stat tiles right at the top so the operator has context before choosing:
- **مدفوع حتى الآن** — total paid across all payment records
- **ليالٍ مقضية** — nights from check-in to today (a smart default for the day count)
- **إجمالي الحجز** — original booking total

When "تعديل المبلغ بناءً على الأيام" is selected:
- The day-count input has a shortcut button `استخدم N` that auto-fills with `nights stayed`
- Below the input, a preview shows either:
  - **"سيتم إنشاء استرداد تلقائي"** with the exact refund amount, when the guest overpaid, OR
  - **"لا استرداد. النزيل لا يزال مديناً بـ X"** when the guest still owes, OR
  - Nothing when it's exact

The operator sees the financial outcome of the action before pressing confirm.

## 3. White line at the top

Root cause identified via your DevTools screenshots: the `<header>` component had `bg-canvas` (pure white) and `border-b border-hairline`. The main content below uses `bg-page` (near-white). Combined, that created a visible horizontal band of pure white above every page — most visible on the analytics view where the content sits below empty space.

Fix: header now uses `bg-page` (matching the main below it) and no bottom border. Also tightened `py-3` → `py-2` for a slightly more compact top strip. Same layout, no color break.

## Install

```bash
unzip -o rentflow-fixpack-2.zip -d .
cp -r patch/api/*                    api/
cp -r patch/src/components/layout/*  src/components/layout/
cp -r patch/src/components/views/*   src/components/views/
rm -rf patch rentflow-fixpack-2.zip

git add -A
git commit -m "feat: early checkout auto-refund + checkout modal polish; fix: header white line"
git push origin design-md-changes
```

No schema changes, so Vercel's `prisma db push` won't touch the DB. Deploy is safe.

## Files changed

- `api/bookings.js` — auto-create refund `Payment` on early checkout overpayment
- `src/components/views/ResidentsView.jsx` — enhanced checkout modal with paid/nights/refund preview + imports for computeBookingTotals
- `src/components/layout/Header.jsx` — bg transparent, tightened padding, cleaned unused imports
