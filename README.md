# Rent Flow — Remove duplicate "New Rule" button on mobile Pricing

Small fix. One file.

## What was wrong

R4 removed the desktop-row "New Rule" button from PricingView, but missed a **second, mobile-only duplicate** (`md:hidden`) sitting right above the rules list, next to the scope filter dropdown. That one survived because it was in a different spot in the file than the one I checked.

Now that the mobile FAB (from the last patch) opens the same form, this button was redundant — pressing either one did the same thing.

## Fix

Removed the mobile-only duplicate button. The scope-filter dropdown stays; it just no longer has a button glued to it.

**Left untouched:** the "إنشاء قاعدة أولى" (Create first rule) button inside the empty state — that's a legitimate first-run affordance, not a toolbar duplicate. Same pattern exists in ExpensesView's empty state and is intentional.

## Files touched (1)

- `src/components/views/PricingView.jsx`

## Install

```bash
unzip -o rentflow-pricing-btn-fix.zip -d .
cp -r patch/. .
rm -rf patch rentflow-pricing-btn-fix.zip

git add -A
git commit -m "fix: remove duplicate mobile New Rule button in PricingView (FAB covers it)"
git push origin design-md-changes
```

## Verify

Open Pricing on your phone — only the scope-filter dropdown shows at the top now, no button next to it. The green FAB in the bottom nav still opens the new-rule form.
