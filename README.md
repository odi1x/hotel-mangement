# Rent Flow — Mobile FAB fix (context-aware primary action)

You were right — real bug, sorry about that.

## What happened

When I made the desktop header button context-aware (r4 patch), I removed the internal "New X" buttons from ExpensesView, MaintenanceView, CleaningView, PricingView — assuming the header button covered it.

**I missed that mobile has a completely separate primary-action button: the floating action button (FAB) in the bottom nav.** That FAB was hardcoded to always open "new booking" and only appeared on 3 tabs (Availability, Requests, Residents). It was never extended to Cleaning, Expenses, Maintenance, or Pricing.

Once I removed those views' internal buttons, mobile users had zero way to create anything on those four tabs — no header button (desktop-only), no FAB (booking-only), nothing.

## Fix

Generalized the FAB the same way I generalized the desktop header button — one config table, same permission gates:

| View | FAB label | Permission |
|---|---|---|
| Availability, Requests, Residents, Apartments | حجز جديد | Everyone |
| Cleaning | مهمة جديدة | Admin only |
| Expenses | مصروف جديد | Admin or canEdit |
| Maintenance | بلاغ جديد | Admin or canViewMaintenance |
| Pricing | قاعدة جديدة | Admin or canViewPricing |
| Everything else (Balances, Analytics, Settings, More) | — | FAB hidden |

The FAB is always mounted (it's `position: fixed` in Layout, renders across every view — including views reached via "المزيد" like Cleaning/Expenses/Maintenance/Pricing, which aren't in the bottom bar itself). It just changes its icon-action and visibility based on the current view, mirroring the desktop header exactly.

**Same trigger mechanism as desktop** — Layout already had `cleaningAddTrigger`, `expensesAddTrigger`, `maintenanceAddTrigger`, `pricingAddTrigger` counters wired to the header buttons. I passed the same setters down into `MobileBottomNav` so the FAB increments the same triggers. No duplicate logic, no new state — just reusing what the desktop button already does.

## Files touched (2)

- `src/components/layout/MobileBottomNav.jsx` — FAB is now context-aware
- `src/components/layout/Layout.jsx` — passes the 4 trigger setters to MobileBottomNav

## Install

```bash
unzip -o rentflow-mobile-fab-fix.zip -d .
cp -r patch/. .
rm -rf patch rentflow-mobile-fab-fix.zip

git add -A
git commit -m "fix: mobile FAB context-aware per tab (was booking-only, broke cleaning/expenses/maintenance/pricing creation on mobile)"
git push origin design-md-changes
```

## Verify — on your phone

1. **Cleaning tab** (via المزيد → التنظيف): green circle FAB appears bottom-right. Tap it → new cleaning task modal opens. (Admin only — if logged in as staff, FAB is hidden here, matching desktop.)
2. **Expenses tab:** FAB opens the expense form.
3. **Maintenance tab:** FAB opens the maintenance report form.
4. **Pricing tab:** FAB opens the pricing rule form.
5. **Availability / Requests / Residents / Apartments:** FAB still opens "new booking" — unchanged.
6. **Balances / Analytics / Settings / More itself:** no FAB — matches desktop (no header button there either).

Sorry again for missing this in the last round — should be solid now across both desktop and mobile.
