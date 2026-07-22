# Rent Flow — Mobile Followup 6: Portal All Modals (Header Blur Fix, App-Wide)

You were right — the header-blur issue affected every modal in the app, not just Analytics. Each one needed the same portal treatment I applied to the breakdown modal.

## What went wrong before

Even after removing the `transform` from `.anim-tab`, the modals rendered from inside views were still trapped in some ancestor stacking context. I don't know exactly which one — could be `overflow-hidden` interacting with iOS Safari, could be an implicit `will-change` from any animated ancestor, could be something else. The debugging rabbit hole is deep.

## What I did instead

Portaled **all 14 modals** to `document.body`. This bypasses every ancestor's stacking context by rendering the modal at the root of the document. `fixed inset-0` reaches the true viewport regardless of what's above in the DOM. Same technique that fixed the analytics modal and the notification/profile dropdowns.

## Modals portaled

**Standalone modal components (7):**
- `BookingForm.jsx` — the main "add/edit booking" form
- `BookByDateModal.jsx` — the "new booking" flow triggered by FAB
- `MaintenanceIssueForm.jsx` — used in image 1
- `PricingRuleForm.jsx` — used in image 2
- `StaffFormModal.jsx` — used in Settings → Staff
- `ProfileSettingsModal.jsx` — profile editor
- `PaymentLedgerModal.jsx` — payment history

**Inline modals in views (7):**
- `AnalyticsView` — breakdown modal (already portaled last patch)
- `ApartmentsView` — apartment edit modal (image 3)
- `AvailabilityView` — day-bookings list + booking detail (2 modals)
- `MaintenanceView` — delete confirm
- `PricingView` — delete confirm
- `ResidentsView` — checkout modal (image 4-adjacent), note modal (image 4), delete confirm, print selector (image 5)

Total: 14 modals now portal to document.body.

Also cleaned up one leftover hex leak (`border-[#2e2e2e]` in MaintenanceIssueForm → `border-hairline-dark-soft`).

## How this looks in code

Standalone modal:
```jsx
import { createPortal } from 'react-dom';

export default function MyModal({...}) {
  return createPortal(
    <div className="fixed inset-0 ...">
      ...
    </div>,
    document.body
  );
}
```

Inline conditional modal:
```jsx
{isOpen && createPortal(
  <div className="fixed inset-0 ...">
    ...
  </div>,
  document.body
)}
```

## Files touched (13)

- `src/components/ui/BookingForm.jsx`
- `src/components/ui/BookByDateModal.jsx`
- `src/components/ui/MaintenanceIssueForm.jsx`
- `src/components/ui/PricingRuleForm.jsx`
- `src/components/ui/StaffFormModal.jsx`
- `src/components/ui/ProfileSettingsModal.jsx`
- `src/components/ui/PaymentLedgerModal.jsx`
- `src/components/views/ApartmentsView.jsx`
- `src/components/views/AvailabilityView.jsx`
- `src/components/views/MaintenanceView.jsx`
- `src/components/views/PricingView.jsx`
- `src/components/views/ResidentsView.jsx`

(AnalyticsView + ShareLinkModal were already portaled in previous patches — unchanged this round.)

## Install

```bash
unzip -o rentflow-mobile-followup6.zip -d .
cp -r patch/src  ./
rm -rf patch rentflow-mobile-followup6.zip

git add -A
git commit -m "mobile followup 6: portal every modal — fixes header-blur app-wide"
git push origin design-md-changes
```

## After deploy — what to verify

Open **any** modal on mobile and check:
- The header (profile pic, bell, title) should be blurred behind the backdrop
- The floating nav should be hidden
- The bottom scrim should be hidden
- No visible calendar/content peeking around the modal edges

Specifically test the ones from your screenshots:
1. **Maintenance** → tap "بلاغ جديد" (image 1)
2. **Pricing** → tap "قاعدة جديدة" (image 2)
3. **Apartments** → tap edit on any apartment (image 3)
4. **Residents** → tap "ملاحظات" on a booking (image 4)
5. **Residents** → tap print icon on a booking (image 5)

All should now blur the header consistently.

## What I learned

Portals are the right primitive for modals period. I should have applied them to every modal in the initial mobile pass rather than fighting stacking context issues after the fact. Now the app is more resilient — if someone adds a new transformed ancestor later (for animations or visual effects), modals won't break.
