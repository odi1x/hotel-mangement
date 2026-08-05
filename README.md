# Rent Flow — Cleaning R3: smart Save/Finish button + grid always open

Four tweaks from your feedback. One file.

## What changed

### 1. One smart button instead of two

Before: modal had a small "حفظ التعليمات" button below the grid AND a main "إنهاء" button at the bottom. Confusing — two ways to save/finish.

Now: **one main button that changes based on state.**

- **Staff (never can edit checklist):** always shows `إنهاء` (or `تم الانتهاء` if no checklist). One click completes and closes.
- **Admin, unsaved changes:** shows `حفظ المهام`. One click saves the checklist without closing — modal stays open so admin can review or the cleaner can then complete it.
- **Admin, no unsaved changes:** shows `إنهاء (X/Y)`. One click completes and closes.

The small "حفظ التعليمات" button is gone. Everything routes through the main button.

### 2. Grid expanded by default for admin

Previously the "ما يحتاج تنظيف إضافي" section defaulted to collapsed unless the task already had a checklist. Admin had to tap to expand it every time — a small papercut that adds up.

Now: always expanded when the modal opens. Collapse toggle still available if admin wants to hide it.

### 3. "Unsaved changes" detection

Admin adds/removes an area, or edits an area's note → button becomes `حفظ المهام`.
Admin (or cleaner) ticks a checkbox → does NOT count as unsaved edit (that's a cleaner action, not an admin edit). Button stays as `إنهاء`.

This lets:
- Admin set up the checklist + hand off to cleaner
- Cleaner tick through the items and finish, all with one clear "Finish" button
- Admin come back later, add one more area → button flips to `حفظ المهام` → save → back to `إنهاء`

### 4. Staff behavior clarified

Staff sees exactly the same modal minus the admin grid section. They see:
- Task title + apartment
- The checklist (as tap-to-check boxes)
- Cleaner notes field
- One button: `إنهاء (X/Y)` or `تم الانتهاء` if there's no checklist

## Mobile view

Not touched in this patch. You said we could do desktop first — this patch is desktop-focused. Once you deploy and test, we'll do a mobile pass together.

## Files touched (1)

- `src/components/views/CleaningView.jsx`

## Install

```bash
unzip -o rentflow-cleaning-r3.zip -d .
cp -r patch/. .
rm -rf patch rentflow-cleaning-r3.zip

git add -A
git commit -m "cleaning r3: smart save/finish button, grid always open, remove secondary save button"
git push origin design-md-changes
```

## Verify

1. **Admin — fresh task (auto-generated from checkout):**
   - Open task → grid is already expanded (didn't have to tap)
   - Button shows `تم الانتهاء` (no checklist yet)
   - Tap a couple of area tiles → button flips to `حفظ المهام`
   - Click → save happens, modal stays open, button flips back to `إنهاء (0/2)`

2. **Admin — reopen a task with saved checklist:**
   - Button shows `إنهاء (X/Y)` (matches the checked state)
   - Tap another area tile → button flips to `حفظ المهام`
   - Click Save → modal stays open, button back to `إنهاء`
   - Click again → task completes, modal closes

3. **Staff — same task:**
   - Grid section is completely hidden
   - Only sees checklist + notes + `إنهاء (X/Y)` button
   - One click completes and closes
