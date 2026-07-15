# Rent Flow — Fix Pack #1

Follow-up patch on top of `rentflow-maintenance-pricing-patch.zip`. Addresses your UX feedback and the "maintenance not counted in analytics" bug.

## What's fixed

### 1. Priority is no longer a scary 0–100 number
Replaced the "الأولوية (0-100)" input with three clear buttons: **منخفضة / عادية / عالية**. Same underlying values (25 / 50 / 75) — you don't need to think in numbers anymore. When two rules overlap, higher importance wins.

### 2. Weekend pricing now actually works
Rules now have an "أيام تطبيق القاعدة" (days of week) section. Three quick presets:
- **كل الأيام** (default) — rule applies every day in the date range
- **عطلة نهاية الأسبوع (الجمعة + السبت)** — Saudi weekend only
- **أيام العمل (الأحد – الخميس)** — workweek only

Plus 7 individual day toggles if you need something custom (e.g., "Thursday nights only").

**How to set up a weekend surcharge**: create a rule named "عطلة نهاية الأسبوع"، pick a long date range (like today → end of 2027 — it'll just recur every weekend), click the "عطلة نهاية الأسبوع" preset, set value to ×1.3, save. Done.

### 3. No more ugly browser date picker
Replaced the native `<input type="date">` with the same `DatePickerCal` component the booking form uses. One range picker, styled to match the rest of the app.

### 4. Maintenance costs now count in analytics
When a maintenance issue is resolved with a cost logged, that cost:
- Gets added to **totalExpenses** in the analytics summary
- Shows as a separate line item **"تكاليف الصيانة"** in the profit breakdown modal (the one you screenshotted)
- Feeds into the monthly expenses trend chart on the correct month

Filters apply naturally — filter by apartment or date range and only maintenance costs in scope get counted.

### 5. Overlap conflict warning in the rule form
When you're creating/editing a rule, if it overlaps with any existing rule (same dates + same days + same scope), a warning box appears at the bottom listing the overlapping rules and their importance levels. Makes it obvious when priority actually matters.

## About the "white line in the analytics page"

I looked at the analytics view code and didn't spot anything obviously wrong at the top. Can you send another screenshot with the profit modal **closed** and the white line clearly visible? It could be:
- A border rendering thick on some resolutions
- A gap between two card components
- Something specific to your browser zoom or theme

Once I see it clearly I can fix it in one shot.

## How to install

```bash
unzip -o rentflow-pricing-fixpack-1.zip -d .
cp -r patch/prisma/schema.prisma          prisma/schema.prisma
cp -r patch/api/*                         api/
cp -r patch/src/lib/*                     src/lib/
cp -r patch/src/components/ui/*           src/components/ui/
cp -r patch/src/components/views/*        src/components/views/
rm -rf patch rentflow-pricing-fixpack-1.zip

git add -A
git commit -m "fix: pricing UX + maintenance in analytics"
git push origin design-md-changes    # or main, wherever you're deploying
```

Prisma will `db push` on Vercel and add the `daysOfWeek` column to `PricingRule` automatically. No manual migration needed. Since no rules use daysOfWeek yet, existing rules will default to `[]` (= apply every day, no change in behavior).

## Files changed

- `prisma/schema.prisma` — added `daysOfWeek Int[]` to `PricingRule`
- `api/admin-resources.js` — accepts + validates daysOfWeek in create/update
- `api/analytics.js` — maintenance costs added to totalExpenses, trend map, and profit breakdown line item
- `src/lib/pricingUtils.js` — day-of-week filtering in `ruleActiveOnDate`; new helpers (DAYS_OF_WEEK, WEEKEND_DAYS, WORKWEEK_DAYS, PRIORITY_LEVELS, summarizeDaysOfWeek)
- `src/components/ui/PricingRuleForm.jsx` — rewritten with DatePickerCal, 3-button priority, day-of-week picker, live overlap conflict warning
- `src/components/views/PricingView.jsx` — rule list now shows day-of-week summary
