# Rent Flow — Hotfix: /api/admin-resources 500 errors

Critical hotfix. Phase 2b left a syntax error in `api/admin-resources.js` that caused the entire endpoint to return 500 for every request. Symptoms:

- ExpensesView shows "لا مصروفات بعد" empty state even when data exists
- Maintenance tab fails silently
- Pricing rules tab fails silently
- All three break because they share the same admin-resources endpoint

## The bug

When I rewrote the `runInitialMigration` function in Phase 2b via a Python script, the replacement left the function body unclosed:

```js
async function runInitialMigration(userId) {
  // ...
  if (maintRows.length > 0) {
    await prisma.expense.createMany({ data: maintRows });
}   // <-- this closes the if, but the function has no closing brace

/**
 * Called from maintenanceHandler...
 */
export async function syncMaintenanceExpense(issue) {
  // ...
}
```

That's still technically parseable as JavaScript at module scope, but the two functions became structurally intertwined and any call to `runInitialMigration` (which happens on every GET /expenses request) threw at runtime.

## The fix

One missing closing brace:

```js
  if (maintRows.length > 0) {
    await prisma.expense.createMany({ data: maintRows });
  }
}   // <-- function properly closed
```

That's it. One file, one line change.

## Files touched (1)

- `api/admin-resources.js`

## Install

```bash
unzip -o rentflow-hotfix-admin-resources.zip -d .
cp -r patch/api  ./
rm -rf patch rentflow-hotfix-admin-resources.zip

git add -A
git commit -m "hotfix: close runInitialMigration function properly (was causing 500 on admin-resources)"
git push origin design-md-changes
```

## After deploy — what to verify

1. **Open المصروفات** — you should now see your actual data. Salaries and rent should appear (from Phase 1b's auto-migration + Phase 2c's recurring visibility fix)
2. **Check the browser console** — no more 500 errors on `/api/admin-resources`
3. **Open الصيانة and الأسعار الموسمية** — those should also work again if they were broken

## Apology / retro

I should have run a proper build test before shipping Phase 2b instead of trusting the Python script's output. The vite build catches these instantly. My mistake.

For future patches — I'll always run `npx vite build` end-to-end before packaging, regardless of how confident I am in the changes. This one was preventable.
