# Rent Flow — Settings Mobile Round 2

2 files. Fixes the two things you caught: sub-tabs still clipping, and Staff tab getting no mobile treatment.

## What changed

### 1. Sub-tabs — short labels on mobile so ALL 4 fit

**The real problem**: my last patch made them scrollable, but users can't tell there's content to scroll to. If the 4th tab is off-screen, it might as well not exist. Horizontal scroll works for lists of many items where users expect to swipe, but for a fixed set of 4 tabs, "all visible" beats "scrollable but hidden".

**Fix**: added a `shortLabel` for each tab:

| Full (desktop) | Short (mobile) |
|---|---|
| الهوية والمعلومات | الهوية |
| التراخيص والعقود | التراخيص |
| المصروفات والتشغيل | المصروفات |
| خيارات النظام | النظام |

Rendered via `<span className="md:hidden">{tab.shortLabel}</span>` + `<span className="hidden md:inline">{tab.label}</span>`. Desktop labels unchanged. All 4 mobile pills now fit in one row without scrolling. Removed the `overflow-x-auto` and `scrollbar-none` scroll infrastructure since we don't need it anymore.

### 2. Staff Management — mobile card view (like the salary table)

**Real gap**: I did the salary table in Settings → Finance last patch but missed the parallel 5-column table in Settings → إدارة الموظفين. Same issue: الموظف / اسم المستخدم / تاريخ الإضافة / الصلاحيات / إجراءات all fighting for 375px = several columns clip.

**Fix**: same pattern as the salary table.

- **Desktop** (`hidden md:block`): the 5-column table exactly as before.
- **Mobile** (`md:hidden`): a stacked card per staff member.
  - Row 1: profile picture + name/username on the leading edge, edit + delete icons on the trailing edge (`p-2` for 44px tap targets)
  - Row 2: permission badges (wraps naturally)
  - Row 3: creation date as small eyebrow text

Extracted the permission badge logic into a `<PermissionBadges />` helper so desktop table + mobile card share the exact same rendering — no drift risk.

### 3. Bonus: permission badges now show ALL 8 permissions

**The old badge list only had 5**: حجز / تعديل / حذف / إحصائيات / إعدادات. It didn't include the three I added later (`canViewBalances`, `canViewMaintenance`, `canViewPricing`) or the receptionist flag (`canViewPrices`).

**Updated**: now shows all 8 as pill badges when true:
- حجز (canBook)
- تعديل (canEdit)
- حذف (canDelete)
- مستحقات (canViewBalances)
- صيانة (canViewMaintenance)
- أسعار موسمية (canViewPricing)
- إحصائيات (canViewAnalytics)
- إعدادات (canViewSettings)

Plus one **inverted** badge for `canViewPrices === false`: a dashed **"بدون أسعار"** — the receptionist mode indicator. When you set up a staff as receptionist (`canViewPrices: false`), you'll now see at a glance which staff have that restriction from the list.

### 4. Header row on staff tab stacks properly on mobile

Header was `flex justify-between` — title + subtitle on right, "إضافة موظف" button on left. On mobile this crammed. Now `flex-col md:flex-row` — title/subtitle stack on top of the button on mobile. Same clean pattern as elsewhere.

## Files touched

- `src/components/views/SettingsView.jsx` — sub-tab shortLabel + tighter mobile paddings
- `src/components/views/settings/StaffManagement.jsx` — mobile card view + `<PermissionBadges />` helper with all 8 permissions

## Install

```bash
unzip -o rentflow-settings-mobile-r2.zip -d .
cp -r patch/src  ./
rm -rf patch rentflow-settings-mobile-r2.zip

git add -A
git commit -m "mobile(settings r2): short sub-tab labels + staff cards + all-8 permission badges"
git push origin design-md-changes
```

## After deploy — what to check on phone

1. **Settings → إعدادات المنشأة** — all 4 sub-tabs (الهوية / التراخيص / المصروفات / النظام) visible in one row without scrolling. Tap any one to switch.
2. **Settings → إدارة الموظفين** — staff should render as stacked cards, one per staff member. Profile pic + name/username on top, permission badges below, date at bottom.
3. **A staff with canViewPrices=off** — should show a dashed "بدون أسعار" badge as a distinct visual signal that this is a restricted-price staff.
4. **Edit/Delete icons** — should feel comfortable to tap (10px padding = 44px effective tap target).
5. **Desktop** — everything should look identical to before. Long sub-tab labels, table view for staff, same badge layout.

## What's still not touched

The three sub-tabs I looked at in the last round (Identity, Legal, System) already work fine on mobile. If any specific piece is still crushing on your phone, screenshot and tell me. Otherwise Settings is done.
