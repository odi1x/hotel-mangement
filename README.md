# Rent Flow — Cleaning R4: auto-close save + context-aware primary button

Two things from your last message. Five files.

## 1. Save Tasks auto-closes

Admin taps "حفظ المهام" → task saves → modal closes automatically. No more manually dismissing.

If admin wants to keep editing, they can reopen the task. Otherwise the flow is: open → set areas + notes → save → done, one action per modal open.

## 2. Header button is context-aware per tab

The top-right "حجز جديد" button was showing on every page, even ones that had nothing to do with bookings (like Cleaning, Expenses, Maintenance, Pricing). Now each tab gets the button that matches what that tab does.

| Tab | Button | Opens |
|---|---|---|
| Availability | حجز جديد | Booking form |
| Apartments | حجز جديد | Booking form |
| Residents | حجز جديد | Booking form |
| Requests | حجز جديد | Booking form |
| **Cleaning** | **مهمة جديدة** | New cleaning task modal |
| **Expenses** | **مصروف جديد** | New expense modal |
| **Maintenance** | **بلاغ جديد** | New maintenance report modal |
| **Pricing** | **قاعدة جديدة** | New pricing rule modal |
| Balances / Analytics / Settings | (none) | — |

Each button is permission-gated appropriately:
- Cleaning button → admin only
- Expenses button → admin or `canEdit`
- Maintenance button → admin or `canViewMaintenance`
- Pricing button → admin or `canViewPricing`

**Internal buttons removed.** The old "+ مصروف جديد" / "+ بلاغ جديد" / "+ قاعدة جديدة" buttons that lived inside each view's toolbar are gone — the header button handles it now. This makes the UI feel consistent: same button, same spot, tab-specific action.

## How the wiring works (technical note)

Each view accepts an `addTrigger` counter prop from Layout. When you click the header button, Layout increments the counter. The view watches for the counter to change via a `useRef` (so it doesn't fire on remount if the counter is already >0), and opens its own add-modal in response.

This keeps the modals inside their respective views (where they belong) while giving Layout control over the entry-point button. Simple pattern, no context or refs across boundaries.

## Files touched (5)

- `src/components/layout/Layout.jsx` — 4 triggers + 4 buttons + prop passing
- `src/components/views/CleaningView.jsx` — receiver + save auto-close
- `src/components/views/ExpensesView.jsx` — receiver + removed internal button
- `src/components/views/MaintenanceView.jsx` — receiver + removed internal button
- `src/components/views/PricingView.jsx` — receiver + removed internal button

## Install

```bash
unzip -o rentflow-cleaning-r4.zip -d .
cp -r patch/. .
rm -rf patch rentflow-cleaning-r4.zip

git add -A
git commit -m "cleaning r4: auto-close save, context-aware header buttons per tab"
git push origin design-md-changes
```

## Verify

1. **Cleaning:** admin taps "مهمة جديدة" in header → new task modal opens. Inside a task: tap tiles, edit notes, tap "حفظ المهام" → saves and closes.
2. **Expenses:** admin (or staff with canEdit) taps "مصروف جديد" in header → expense form opens. The old internal button is gone.
3. **Maintenance:** same pattern with "بلاغ جديد".
4. **Pricing:** same with "قاعدة جديدة".
5. **Booking-related tabs (Availability/Apartments/Residents/Requests):** still show "حجز جديد" as before.
6. **Balances/Analytics/Settings:** no button on the top-right.

## Next

Mobile view for the cleaning tab (you mentioned we'd tackle that after this). Say when ready.
