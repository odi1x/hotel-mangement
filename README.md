# Rent Flow — Settings Mobile Fixes

1 file. Four fixes to the Settings tabs after the sweep you asked for.

## What changed

### 1. Sub-tabs — horizontal scroll instead of wrap

**Before**: The 4 sub-tabs (الهوية والمعلومات / التراخيص والعقود / المصروفات والتشغيل / خيارات النظام) used `nav-pill-group flex-wrap`. On mobile the pills wrapped into 2 rows because 4 Arabic labels don't fit horizontally — looked messy and doubled the header height.

**After**: horizontal scrolling row on mobile — one line of tabs, users swipe left/right if they need to reach the last one. Added `overflow-x-auto scrollbar-none whitespace-nowrap shrink-0` to the pills and used the negative-margin trick (`-mx-3 px-3`) so the scroll extends past the card padding into the viewport edges for that natural "swipe reveals more" feel. Desktop unchanged.

Also dropped pill text `text-sm` → `text-xs` on mobile since the tabs are packed together.

### 2. Salary/Staff table — cards on mobile

**Before**: The staff-expenses table under "الرواتب والموظفين" had 4 columns (الاسم / الراتب / النطاق / إجراء). At 375px width it clipped — you could see the last 1-2 columns but not the name.

**After**: same pattern I used for ResidentsView — desktop table (`hidden md:block`), mobile card list (`md:hidden`). Each mobile card:
- Row 1: staff name (leading), delete icon (trailing)
- Row 2: salary in accent color + `·` + scope description

Empty state also converted to a card-styled "no staff added" message.

### 3. License add row — stacks on mobile

**Before**: The "add license" row in the التراخيص tab had `<text input> + <date input> + <button>` all in one flex row. On mobile the two inputs got squeezed and the icon button became tiny.

**After**: `flex flex-col md:flex-row` — stacks vertically on mobile with full-width inputs and a proper 44px button showing both icon + "إضافة" text. Desktop stays one row as before.

### 4. Bonus fixes

- **Card padding**: `p-3 md:p-6 md:p-8` on the sub-tabs section, `px-3 md:px-8` on the content scroll, `p-3 md:p-8` on the footer — tighter mobile padding so content gets more actual width.
- **Hex leak**: `dark:bg-[#3a3a3a]` on the push toggle → `dark:bg-hairline-dark-soft`.

## What I checked but didn't touch

- **Identity tab**: two file-upload cards use `grid grid-cols-1 md:grid-cols-2 gap-6` — already stacks properly on mobile. No change needed.
- **System tab**: forms use compact layouts, push toggle + accent colors both work at mobile widths. Only had the hex leak, now fixed.
- **Legal tab** (rest): the license list below the add-row is already `flex flex-col gap-2` — vertical cards, works on mobile.
- **Finance tab** (rest): the expense add form was already `flex flex-col md:flex-row gap-4` — good.

## Install

```bash
unzip -o rentflow-settings-mobile-fixes.zip -d .
cp -r patch/src  ./
rm -rf patch rentflow-settings-mobile-fixes.zip

git add -A
git commit -m "mobile(settings): sub-tab scroll + salary card view + license stack + padding polish"
git push origin design-md-changes
```

## After deploy — what to check

1. **Settings sub-tabs** — should be one horizontal row you can swipe if all 4 don't fit. No more 2-row wrap.
2. **Finance tab → الرواتب والموظفين** — the salary list should be stacked cards (name + salary + scope + delete icon), not a clipped table.
3. **Legal tab → أضف رقم ترخيص جديد row** — license number, expiration date, and "إضافة" button should stack vertically on mobile with full-width fields.
4. **Overall padding** — content should have more usable width now (12px card padding instead of 24-32px on mobile).

Desktop: everything unchanged.
