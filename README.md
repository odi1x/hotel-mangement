# Rent Flow — Expenses Feature (Phase 1b): Migration + Integrations

Phase 1a shipped the core Expenses feature. Phase 1b brings your existing data over, wires up maintenance-to-expense auto-linking, updates Analytics to read from the new table, and cleans up Settings.

Also: **removed the "branch" concept** from Phase 1a. I mixed contexts with the football academy — Rent Flow doesn't have branches. Scope is now just `global | unit`.

## 7 things this patch does

### 1. Branch removed from Phase 1a

- Schema: `Expense.branch` field dropped
- ExpenseForm: no more "فرع محدد" scope option, no branch text input
- ExpensesView: no branch display in row metadata
- API: no branch in POST/PUT
- Scope is now just: **كل الأنشطة** (global) or **وحدة محددة** (unit)

### 2. Auto-migration on first Expenses page load

When you open the Expenses tab for the first time after this deploys, the API detects you have zero Expense records and automatically seeds from your existing data:

- **Each `StaffExpense`** → Expense row (category=staff, isRecurring=monthly, sourceType=migration)
- **Apartment.rentCost** → Expense (category=rent, scope=unit, isRecurring, sourceType=migration)
- **Apartment.cleaningCost** (only if type='salaried') → Expense (category=supplies, scope=unit, isRecurring)
- **Apartment.otherExpenseAmount** → Expense (category=other, scope=unit, isRecurring)
- **Every resolved maintenance issue with cost > 0** → Expense (category=maintenance, dated on `resolvedAt`, sourceType=maintenance, sourceRefId=issue.id) — this backfills your maintenance history

Idempotency: the seed only runs when `count() === 0` for the user, so it can't run twice. If you delete all your expenses later, it will trigger again on next load. That's a feature, not a bug (safety net).

The recurring migrated rows are dated **today** with `isRecurring=true`. They don't backfill 6 months of history because that would generate synthetic data. Phase 2's cron will generate future months automatically.

Per-booking variable costs (per_booking cleaning, percentage platform fee) stay on the Apartment model — they're transaction-specific, not fixed monthly expenses.

### 3. Maintenance → Expense auto-link

New helper `syncMaintenanceExpense(issue)` runs on every maintenance POST/PUT. It maintains this invariant:

> Every resolved MaintenanceIssue with `cost > 0` has exactly one linked Expense row.

Behavior:
- Issue marked resolved with cost → creates Expense (category=maintenance, scope=unit, apartmentId, sourceType=maintenance, sourceRefId=issue.id)
- Issue's cost changes → updates the linked Expense to match
- Issue re-opened (status changes from resolved) → **deletes** the linked Expense (money didn't actually go out)
- Issue's cost cleared to null → also deletes

Vendor + notes flow through: `issue.contractor` → `expense.vendor`, `issue.description` → `expense.notes`.

You'll see maintenance-linked expenses in the ExpensesView list mixed with your manual ones. They open the maintenance issue on tap (Phase 2 will polish that link).

### 4. Analytics reads from Expense table post-migration

`api/analytics.js` now checks: does this user have any Expense records? If yes (`useExpenseTable=true`), it treats the Expense table as the source of truth:

- **Skipped**: staff payroll apportionment from StaffExpense, apartment.rentCost apportionment, MaintenanceIssue cost read (all their data is in Expense table now)
- **Added**: sum of Expense rows with proper scope handling:
  - `scope='unit'` rows: only counted if the unit is in the current filter (or filter is unfiltered)
  - `scope='global'` rows: apportioned by the filter ratio (same as old global overhead)
  - `isRecurring=true` monthly: prorated as `amount × (periodDays / 30) × scopeRatio`
  - `isRecurring=true` yearly: prorated as `amount × (periodDays / 365) × scopeRatio`
  - One-time: only counted if date falls in the analytics period

Result: after migration, Analytics numbers should stay consistent with what they were before. If you notice a drift, it's likely because per-booking cleaning/platform fees are still handled separately (as they should be — they're per-transaction, not fixed monthly overhead).

Pre-migration users get the old behavior unchanged.

### 5. Settings finance tab removed

The "المصروفات والتشغيل" sub-tab under facility settings is gone. Users default to "الهوية" tab. All the salary + operational cost editing that used to live there now happens in the top-level Expenses tab.

Dead code removed:
- The `finance` entry in `facilitySubTabs`
- The entire `{facilityTab === 'finance' && …}` render block (~200 lines)
- Unused `staffExpenses` + `fetchStaffExpenses` from `useData()` destructuring in SettingsView

### 6. Migration is safe and reversible

- StaffExpense table stays in schema (backward compat — the migration reads from it, doesn't delete)
- Apartment financial fields stay in schema
- If you wanted to roll back to Phase 1a, you'd need to delete all Expense records with `sourceType='migration'` OR `sourceType='maintenance'` and revert the code. The old data sources are still intact.

### 7. Every mutation still respects ownership

All Expense CRUD checks `userId` before allowing the mutation. Same pattern as maintenance + pricing. No user can see or modify another user's expenses.

## Files touched (7)

- `prisma/schema.prisma` — dropped `Expense.branch` field, added `@@index([sourceRefId])` for the maintenance-link lookup
- `api/admin-resources.js` — removed branch from expense CRUD, added `runInitialMigration()` helper (called from GET), added `syncMaintenanceExpense()` helper (called from maintenance POST/PUT)
- `api/analytics.js` — added `useExpenseTable` detection, gated legacy staff/rent/maintenance sources on `!useExpenseTable`, added Expense-table sum with proper scope + recurring handling
- `src/lib/expenseUtils.js` — dropped `branch` from `EXPENSE_SCOPES`
- `src/components/ui/ExpenseForm.jsx` — dropped branch state, branch input field, branch payload
- `src/components/views/ExpensesView.jsx` — dropped branch display in list metadata
- `src/components/views/SettingsView.jsx` — removed `finance` sub-tab entry, removed the entire finance render block, dropped unused staffExpenses import

## Install

```bash
unzip -o rentflow-expenses-phase1b.zip -d .
cp -r patch/prisma  ./
cp -r patch/api     ./
cp -r patch/src     ./
rm -rf patch rentflow-expenses-phase1b.zip

git add -A
git commit -m "expenses phase 1b: auto-migration + maintenance link + analytics cutover + settings cleanup"
git push origin design-md-changes
```

Vercel auto-runs `prisma db push` on deploy — the `branch` column drop happens automatically. No data loss (branch was empty for everyone since Phase 1a only just shipped).

## After deploy — what to verify

1. **First time you open المصروفات after deploy** — you should see all your existing staff salaries + apartment rent costs + resolved maintenance history already there. Rows tagged as recurring show the شهري / سنوي pill. Maintenance rows show under the maintenance category with the issue title.

2. **Toggle to "الكل" time filter** — you should see maintenance rows going back historically (they're dated `resolvedAt`), plus a bunch of today-dated recurring rows for salaries and apartment rents.

3. **Open a maintenance issue and mark it resolved with a cost** — go to ExpensesView, should see it appear as a new maintenance-category row. Edit the cost or reopen the issue → expense updates or disappears accordingly.

4. **Check Analytics** — totalExpenses should be roughly the same as before Phase 1a. If it's way different, tell me the delta and I'll debug. Some drift is expected because scope=unit expenses only count when the unit is in filter (previously staff and rent got apportioned differently).

5. **Open Settings** — you should NOT see the "المصروفات والتشغيل" tab anymore. Just الهوية / التراخيص / النظام.

6. **Try Expenses on mobile** — the whole feature should work with the mobile design language from the earlier work (bottom-sheet form, portaled modals, blurred header, hidden nav during modal, etc.).

## What's deferred to Phase 2

- **Recurring generation cron** — Vercel Cron job that runs daily and creates the next occurrence of each recurring expense when it's due (currently they show up in analytics via proration, but no actual monthly records get created)
- **Per-unit + per-branch P&L** in the Analytics view (uses expense.scope) — the data model supports this, the analytics UI just doesn't render it yet
- **Budget per category** with alerts when approaching
- **Vendor spend analysis** (uses expense.vendor)
- **Receipt upload UI** (field exists on model, upload widget not wired)
- **Bill reminders / renewals** (uses recurringUntil)

## Feedback loop

Try it for a day or two with your real data. Things I'd want to know:
- Are the migrated categories right? (Did rent get labeled properly? Salaries?)
- Are the totals in Analytics close to what they were before?
- Is anything missing from Expenses that used to be somewhere in the old finance tab?
- Do maintenance-linked expenses feel useful, or annoying (they can't be manually edited — they mirror the issue)?

Based on your answers, Phase 2 gets planned more precisely.
