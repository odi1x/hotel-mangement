# Rent Flow — Maintenance Log + Seasonal Pricing

Two features in one patch:

**1. سجل الصيانة (Maintenance Log)** — Log any issue on any unit, track it from open → in progress → resolved. Costs and contractor names get recorded so you'll have real per-unit maintenance history for reporting later.

**2. الأسعار الموسمية (Seasonal Pricing)** — Set rules like "الحج ×2.5" or "رمضان = 800 SAR fixed" and every booking during that period auto-prices. Rules can target one unit or all units. On the booking form, the price now fills in automatically with a breakdown showing which rule contributed how much.

## How to install

From your local clone of the repo, on `main`:

```bash
# 1. Unzip this patch here (say Y to overwrite)
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
git commit -m "feat: maintenance log + seasonal pricing rules"
git push origin main
```

Vercel will run `prisma db push` on deploy, adding the two new tables (`MaintenanceIssue` and `PricingRule`) automatically. No manual migration needed.

## What's new — walk-through

### Maintenance sidebar tab (الصيانة)

The tab has a badge with the number of urgent open issues. If you see a red dot, something's on fire.

The main view is a triage list — chronological, urgent-first, with a **"days open"** counter next to each issue. That counter is the point of the whole feature: forgotten issues show themselves. A 12-day-old urgent AC issue jumps at you.

Filters at the top: مفتوح / قيد المعالجة / منجَز / الكل, plus category and unit filters. Categories are: تكييف / سباكة / كهرباء / أثاث / أجهزة / تنظيف عميق / أخرى.

When you resolve an issue, the form asks for **cost** and **contractor name**. You don't have to fill either. But over months, this becomes real data — which unit chews through repairs, which vendor you actually trust.

**Warn-only integration in booking form.** If a unit has open urgent maintenance and someone tries to book it, the booking form shows a soft warning near the top listing the open issues. Booking still goes through — you're the one deciding. It's a nudge, not a block.

### Pricing sidebar tab (الأسعار الموسمية)

The signature is the **12-month timeline** at the top. Each pricing rule shows up as a colored horizontal bar spanning its date range. Overlapping rules stack vertically, which makes priority conflicts visible instantly — you can *see* Hajj colliding with the weekend rule.

Click any bar to edit that rule. Add new rules with the button at top-right.

A rule has:
- **Name** — "موسم الحج ١٤٤٧", "شهر رمضان", etc.
- **Date range**
- **Scope** — All units, or a specific unit
- **Type** — Multiplier (e.g. ×2.5 of base price) OR Fixed (e.g. 800 SAR/night)
- **Priority** (0–100) — higher wins when rules overlap. Unit-specific rules beat global rules on tie.
- **Color** — pick from a 6-color palette for the timeline

The form shows a live preview: "خلال هذه الفترة، سعر الليلة على [الوحدة] سيكون 1000 ر.س" — before you save.

### How pricing rules affect booking

When you open the booking form and pick a unit + dates:
1. The "السعر / الليلة" field auto-fills with the **average per night** across the stay
2. A breakdown box appears listing which rules applied: "١٠ ليالٍ × 400 (السعر الأساسي) + ٣ ليالٍ × 1000 (موسم الحج)"
3. The total at the bottom is the actual sum of nights (not just avg × nights)

If you type your own price into "السعر / الليلة", the automatic calculation stops and you're back to manual (nights × your price). A link appears — "إعادة حساب السعر تلقائياً حسب القواعد الموسمية" — that switches back on.

The seasonally-computed total is what gets saved as the booking's `totalPrice`, so payment tracking, receipts, and the balances view all see the right number.

## Files in this patch

**New:**
- `api/maintenance.js`
- `api/pricing-rules.js`
- `src/lib/maintenanceUtils.js`
- `src/lib/pricingUtils.js`
- `src/components/ui/MaintenanceIssueForm.jsx`
- `src/components/ui/PricingRuleForm.jsx`
- `src/components/views/MaintenanceView.jsx`
- `src/components/views/PricingView.jsx`

**Modified:**
- `prisma/schema.prisma` — added `MaintenanceIssue` and `PricingRule` models
- `src/context/DataContext.jsx` — added CRUD for both features
- `src/components/ui/BookingForm.jsx` — auto-pricing + maintenance warning
- `src/components/layout/Sidebar.jsx` — added الصيانة + الأسعار الموسمية tabs
- `src/components/layout/Layout.jsx` — routing for both new views

## Design system notes

Kept everything within the existing Cal-inspired monochrome palette. The only exception is the 6-color rule palette (emerald / slate / amber / rose / indigo / teal) which appears **only** on pricing rules — timeline bars, list dots, form preview. Colors here are functional (labels for data), not decorative, which is the same reason calendar apps use colors while staying otherwise monochrome. If you want it purer, you can hardcode all rules to emerald and skip the color picker.

Everything else follows the pattern: treatment (solid / outline / ghost / dashed) instead of color for badges, `tabular-nums` on all numeric displays, `font-semibold` on data, group-hover reveal for action buttons.

## Not included (deferred)

**Owner statements.** You mentioned needing more info from clients before locking down the ownership/commission model. Once you're ready, the maintenance costs and pricing rules will both feed into it cleanly.
