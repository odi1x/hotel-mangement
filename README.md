# Rent Flow — Edit-resident datepicker NaN bug + re-verified print red

Two files.

## 1. "undefined NaN" when editing a resident's dates — real bug, fixed

Same root cause as the earlier Analytics datepicker bug, different location this time.

`DatePickerCal` strictly expects `YYYY-MM-DD` strings. It parses like this:
```js
const parse = (s) => { const [y, m, dd] = s.split('-').map(Number); return new Date(y, m-1, dd); };
```

When you open the edit form for an existing resident/booking, `BookingForm` was passing the booking's `startDate`/`endDate` straight from the API — which come back as full ISO datetimes (`"2026-08-05T00:00:00.000Z"`). Splitting that on `-` gives `["2026", "08", "05T00:00:00.000Z"]`, and `Number("05T00:00:00.000Z")` is `NaN`. Every date field downstream (month name, day number, arrival/departure labels) inherited that NaN — exactly the "undefined NaN" you saw.

**Fix:** added a small `toDateStr()` helper (same pattern already correctly used in `PricingRuleForm`, which is why that one never had this bug) that converts any incoming date — ISO string, Date object, whatever — into clean `YYYY-MM-DD` before it reaches `dateValue` state. Applied on the initial state so editing now shows the real dates immediately.

I checked every other place that feeds `DatePickerCal`:
- `BookByDateModal` — always starts empty, no bug there.
- `PricingRuleForm` — already had the correct conversion, unaffected.
- `PublicBookingView`, `AnalyticsView` — already fixed in earlier patches.

`BookingForm` was the only one still broken.

## 2. Red remaining-amount on print — re-verified, code is correct

I checked the current code and the fix from the last patch IS in place:

```jsx
<p className="text-lg font-black text-red-600">
  {formatSAR(balanceDue)} ر.س
</p>
```

No conditional, no override elsewhere in the codebase (I searched for every occurrence of "المبلغ المتبقي" — there's only the one, inside `PrintAgreement.jsx`), and no print-specific CSS forcing colors back to black. I also confirmed Tailwind's `red` color palette isn't overridden in `tailwind.config.js` (the `extend.colors` block adds custom tokens but never touches the default `red` key), so `text-red-600` should generate normally.

**Most likely explanation:** the previous patch (`rentflow-print-mobile-fixes.zip`) hadn't been deployed yet when you tested. I'm re-shipping `PrintAgreement.jsx` again in this patch (identical to last time) just to be safe — if it's still black after deploying THIS patch, there's something environment-specific going on (browser print settings stripping color, a caching issue, etc.) and I'll need a fresh screenshot of the printed/PDF output to dig further.

## Files touched (2)

- `src/components/ui/BookingForm.jsx` — date conversion fix
- `src/components/ui/PrintAgreement.jsx` — re-shipped, unchanged from last patch

## Install

```bash
unzip -o rentflow-edit-date-print-fix.zip -d .
cp -r patch/. .
rm -rf patch rentflow-edit-date-print-fix.zip

git add -A
git commit -m "fix: edit-resident datepicker NaN (ISO vs YYYY-MM-DD mismatch), re-verify print red remaining-amount"
git push origin design-md-changes
```

## Verify

1. **Edit dates:** open an existing resident/booking, tap to edit check-in/check-out dates — the calendar should show real numbers and month names, arrival/departure labels should show actual dates, not "undefined NaN".
2. **Print red:** generate a سند قبض receipt for any booking, check المبلغ المتبقي — should be red. If it's still black after this deploy, send me a fresh screenshot of the print preview specifically (not the app UI) so I can see exactly what's rendering.
