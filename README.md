# Rent Flow — Maintenance Log + Seasonal Pricing (Vercel Hobby edition)

Same two features as before — Maintenance and Seasonal Pricing — but the two backend endpoints are merged into a single serverless function to fit Vercel Hobby's 12-function cap.

## What changed vs the earlier patch

The old separate `api/maintenance.js` + `api/pricing-rules.js` are gone. Both are now handled by a single file: **`api/admin-resources.js`**.

It dispatches on a `?resource=` query param:
- `?resource=maintenance` → maintenance CRUD
- `?resource=pricing-rules` → pricing rules CRUD

Frontend URLs in `DataContext.jsx` are updated accordingly. From your perspective as a user of the app, nothing changes — the sidebar tabs, the forms, the timeline all work exactly the same. This is purely a deployment thing.

## Install

**Important**: if you already applied the earlier `rentflow-maintenance-pricing-patch.zip`, DELETE the two old API files before applying this one. If you haven't applied the earlier one, ignore this note.

```bash
# 0. Delete old separate endpoints if they exist
rm -f api/maintenance.js api/pricing-rules.js

# 1. Unzip this patch
unzip -o rentflow-maintenance-pricing-patch.zip -d .

# 2. Copy everything into place
cp -r patch/prisma/schema.prisma  prisma/schema.prisma
cp -r patch/api/*                 api/
cp -r patch/src/lib/*             src/lib/
cp -r patch/src/context/*         src/context/
cp -r patch/src/components/ui/*   src/components/ui/
cp -r patch/src/components/views/* src/components/views/
cp -r patch/src/components/layout/* src/components/layout/

# 3. Clean up
rm -rf patch rentflow-maintenance-pricing-patch.zip

# 4. Commit & push
git add -A
git commit -m "feat: maintenance log + seasonal pricing (single endpoint)"
git push origin main
```

You'll now have **12 serverless functions** — exactly at the Hobby cap. This deploy should succeed.

## Important — next feature will hit the same limit

You're at 12/12. Any next feature that needs a new endpoint will fail the same way. Two paths when that happens:

1. **Upgrade to Pro** — $20/mo, no code changes ever.
2. **Merge another endpoint into `admin-resources.js`** — the same pattern I used here. Suitable candidates that are similar in shape: `licenses.js`, `staff-expenses.js`. Both are simple userId-scoped CRUD, similar to what's already in `admin-resources`.

Just so you're not surprised the first time you add a feature and see the same 12-function error.

## If you upgrade to Pro later

You can split `admin-resources.js` back into two files if you prefer. Copy each handler function (`maintenanceHandler` and `pricingRulesHandler`) into its own `api/{name}.js` with the same imports, and change the URLs in `DataContext.jsx` back to `/maintenance` and `/pricing-rules`. No data migration needed.

## Files in this patch

**New:**
- `api/admin-resources.js` ← merged endpoint
- `src/lib/maintenanceUtils.js`
- `src/lib/pricingUtils.js`
- `src/components/ui/MaintenanceIssueForm.jsx`
- `src/components/ui/PricingRuleForm.jsx`
- `src/components/views/MaintenanceView.jsx`
- `src/components/views/PricingView.jsx`

**Modified:**
- `prisma/schema.prisma` — added `MaintenanceIssue` and `PricingRule` models
- `src/context/DataContext.jsx` — CRUD wired to `/admin-resources?resource=...`
- `src/components/ui/BookingForm.jsx` — auto-pricing + maintenance warning
- `src/components/layout/Sidebar.jsx` — added الصيانة + الأسعار الموسمية tabs
- `src/components/layout/Layout.jsx` — routing for both new views

## Features recap (same as before)

**سجل الصيانة** — Log any issue on any unit, track it open → in progress → resolved. Costs and contractor names get recorded for later reporting. Urgent open issues warn in the booking form but don't block bookings.

**الأسعار الموسمية** — Rules like "الحج ×2.5" or "رمضان = 800 SAR fixed". Rules target one unit or all units. Bookings during those periods auto-price with a per-night breakdown. Priority controls overlap resolution.

The 12-month timeline in the Pricing view is the piece I most want your reaction to — it's the whole point of the feature.
