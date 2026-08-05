# Rent Flow — Cleaning follow-up (round 2)

Four fixes based on your feedback.

## 1. Staff CANNOT see the admin grid — real bug fixed

**Root cause:** in `CleaningView`, I checked `user?.canClean` — but the auth response puts that field under `user.permissions.canClean`, not directly on `user`. That meant:
- For staff: `user?.canClean` was `undefined`, so `canClean = isAdmin || false = false` → whole page blocked (they'd see "no permission" screen)
- For admin: `user?.role === 'admin'` gave admin access as expected

**But wait — you said staff CAN see the grid.** Two possibilities:
1. The account you tested was actually admin, not staff (an easy mixup if you have multiple accounts)
2. The staff account somehow has `role: 'admin'` in the database (which would mean it wasn't created as staff)

**Regardless, this patch:**
- Fixes the wrong permission path (`user?.permissions?.canClean` instead of `user?.canClean`)
- Guarantees: staff with `canClean: true` see the page + can complete tasks + tick checkboxes, but the admin grid is strictly gated by `user?.role === 'admin'`

To verify a specific user is truly staff: log in as them, open browser DevTools console, type `localStorage.getItem('token')`, then decode it at jwt.io — the payload should show `"role": "staff"`. If it says `"admin"`, that account has admin role in the DB (not a code issue).

## 2. Finish button = one click, always closes

Removed the "mark done anyway?" two-step confirm. Clicking إنهاء now completes and closes immediately, regardless of whether items are checked.

Button label simplified:
- `تم الانتهاء` (if no checklist)
- `إنهاء (X/Y)` (with checklist, showing progress)

## 3. Page titles + subtitles — every tab now has its own

`Layout.jsx` had:
- No title case for `cleaning` or `expenses` (both showed no title)
- Generic fallback subtitle `إدارة التأجير اليومي والأسبوعي والشهري بدقة.` used on multiple pages

Now every tab has a unique title + subtitle:

| Tab | Subtitle |
|---|---|
| Availability | شاهد وأدِر أشغال الوحدات في التقويم اليومي. |
| Apartments | شقق ومرافق، بيانات وأسعار، مشاركة روابط الحجز. |
| Residents | كل الحجوزات القادمة والحالية والسابقة في مكان واحد. |
| Balances | تتبّع الدفعات والأرصدة المتبقية على الحجوزات. |
| Expenses | سجّل مصروفاتك اليومية والمتكرّرة وتابع أين تذهب أموالك. |
| Cleaning | تابع مهام تنظيف الوحدات بعد المغادرة والمهام الإضافية. |
| Maintenance | وثّق بلاغات الصيانة وتتبّع حالتها حتى الحل. |
| Pricing | اضبط أسعار المواسم والفترات الخاصة تلقائياً. |
| Analytics | مؤشرات الإيرادات، المصروفات، والربحية حسب الوحدة. |
| Settings | إدارة الحساب، الموظفين، والتفضيلات العامة. |
| Requests | راجع طلبات الحجز الواردة عبر الرابط العام. |

## 4. Removed duplicate subtitle from CleaningView

The page had two subtitles:
- Layout provides the page-level title/subtitle at the top
- CleaningView had its own `إدارة تنظيف الوحدات بعد المغادرة والمهام الإضافية` inside the component

Removed the CleaningView-internal one so the Layout version wins (matching how every other tab works). The `مهمة جديدة` button is preserved.

## Files touched (2)

- `src/components/layout/Layout.jsx` — title/subtitle table expanded
- `src/components/views/CleaningView.jsx` — permission check fixed, one-click finish, redundant subtitle removed

## Install

```bash
unzip -o rentflow-cleaning-r2.zip -d .
cp -r patch/. .
rm -rf patch rentflow-cleaning-r2.zip

git add -A
git commit -m "cleaning r2: fix staff gate, one-click finish, unique per-tab titles"
git push origin design-md-changes
```

## Verify

1. **Sign in as staff with canClean=true** — Cleaning tab appears in sidebar, opens the tasks list. Task detail modal shows checkboxes + notes + finish button ONLY. No area grid, no "Save Instructions" button, no delete button.
2. **Sign in as admin** — Same tab, but task detail modal shows the area grid, admin can select areas, add notes, save. Can also delete tasks.
3. **Click Finish once** — Task marks done and modal closes immediately, whether all boxes checked or not.
4. **Each tab has its own subtitle** — Navigate through all sidebar tabs on desktop; the subtitle under the title should be different for every one.
5. **Cleaning tab has a title** — "التنظيف" visible on desktop above the subtitle. No more "no title" state.
