# Rent Flow — Expenses Feature (Phase 1a): Core Ledger

Expenses is now a first-class feature — its own top-level tab, its own data model, its own page. This is **Phase 1a**: the feature is fully usable for manually tracking any money going out. Phase 1b (next patch) brings over your existing StaffExpense records + fixed-cost config + adds the maintenance-to-expense auto-link.

## What's new

**A new sidebar tab** — **المصروفات** — sits between المستحقات and الصيانة. Financial data groups together at that height in the sidebar. Same on mobile: the tab appears in the More menu with the ArrowDownCircle icon.

### The page: a ledger, not a bank statement

The design thesis: numbers get respect, not celebration. Expenses aren't wins — the total doesn't get accent green. The information architecture:

1. **Hero** — "صرفَك هذا الشهر" with the tabular monthly total, a small comparison to last month (up = ink weight, down = accent green), and a 6-month sparkline on the trailing edge (desktop only). The sparkline uses solid ink for the current month, muted surface color for past months. At a glance you see the shape of your spending over time.

2. **Category strip** — this is the signature. Horizontal-scroll on mobile, 4/6-column grid on desktop. Each category card shows category name, its total, its share of the month's spending, and delta vs last month. Only non-empty categories appear. Reads like a ticker.

3. **The list** — filter chips (This Month / Quarter / Year / All + category selector), search, add button, then the row-by-row ledger. Each row: category icon, title, tabular amount, metadata line (date · category · unit if applicable · recurring badge if applicable · vendor if there is one). Edit/delete actions always visible on mobile, hover-only on desktop.

### Categories

10 defaults, all identified by string (not enum) so we can add more without schema migrations:

- إيجارات (rent)
- مرافق (utilities)
- رواتب وموظفين (staff)
- صيانة (maintenance)
- تسويق وإعلانات (marketing)
- تراخيص ورسوم (licenses)
- مستلزمات وأدوات (supplies)
- تأمين (insurance)
- زكاة (zakat)
- أخرى (other)

Each has a dedicated Lucide icon so it's identifiable at a glance in the category strip and the list.

### Scope

Every expense is tagged with a scope:
- **كل الأنشطة** (global) — hits the whole business (marketing, licenses, insurance)
- **فرع محدد** (branch) — specific to one branch (branch rent, branch utilities)
- **وحدة محددة** (unit) — specific to one apartment (that apartment's cleaning fee, per-unit repair)

The scope makes per-branch and per-unit profit calculations possible in Phase 2 analytics. For now the field is stored and displayed; the analytics update comes with Phase 1b.

### Recurring

The form has a "مصروف متكرر" toggle. Turning it on schedules the record for monthly or yearly re-generation. Generation itself is deferred to Phase 2 (needs a Vercel Cron job), but the schema and UI are ready.

## Data model

New `Expense` model in Prisma:

```prisma
model Expense {
  id, userId, title, amount, date
  category         String    @default("other")
  scope            String    @default("global")
  branch           String?
  apartmentId      String?   // when scope=unit
  vendor           String?
  notes            String?
  receiptUrl       String?
  isRecurring      Boolean   @default(false)
  recurringPeriod  String?   // "monthly" | "yearly"
  recurringUntil   DateTime?
  sourceType       String    @default("manual")  // "manual" | "maintenance" | "salary-schedule" | "migration"
  sourceRefId      String?
  createdAt, updatedAt
  user, apartment  (relations)
  @@index([userId]) @@index([userId, date]) @@index([userId, category]) @@index([apartmentId])
}
```

`sourceType` + `sourceRefId` are the provenance fields. Manual entries default to "manual". Phase 1b/2 will use these to link records that come from resolved maintenance issues, recurring generation, or the one-time migration from StaffExpense.

## API

Added to `admin-resources.js` (same reason as maintenance + pricing — Vercel Hobby has a 12-function cap). The endpoint is `?resource=expenses`:

- `GET`  — list, with optional `?category=&scope=&from=&to=&apartmentId=` filters
- `POST` — create (validates title + amount + date)
- `PUT`  — update (validates ownership before applying)
- `DELETE ?id=` — delete (also validates ownership)

Ownership check: every mutation calls `findUnique(id)` first and rejects with 404 if `userId !== targetUserId`. Same pattern as maintenance and pricing.

## Permissions

Expenses gate on `canViewAnalytics` — financial data groups together. Admins bypass. If you want a separate `canViewExpenses` permission later (to let a bookkeeper see expenses without seeing the full analytics revenue breakdown), it's a single-line change in Layout's `GATED_VIEW_PERM` and StaffFormModal.

## What's deferred to Phase 1b (next patch)

- **Migration endpoint** that copies existing StaffExpense records → Expense (category=staff, isRecurring=true, monthly)
- **Migration** of fixed operational costs from user settings → Expense records (category depending on the field)
- **Migration** of per-apartment costs from advanced financials → Expense records (scope=unit)
- **Maintenance→expense auto-link** — resolving a maintenance issue with cost>0 creates a linked Expense record (sourceType=maintenance, sourceRefId=issueId)
- **Analytics update** — the current "totalExpenses" in Analytics reads StaffExpense + user config; update to read from Expense table so totals stay accurate during transition
- **Settings cleanup** — remove the Rawatib / fixed-costs sub-tabs once migration is done

## What's deferred to Phase 2

- Vercel Cron job for recurring generation (daily job, checks all recurring records, creates the next occurrence if due)
- Budget per category (monthly caps + alerts when approaching)
- Per-branch and per-unit P&L in the Analytics view (uses expense.scope)
- Vendor spend analytics (uses expense.vendor)
- Receipt upload (uses expense.receiptUrl — the field exists, UI upload isn't wired yet)

## Files touched (9)

**New:**
- `prisma/schema.prisma` — added Expense model, User.expenses[] + Apartment.expenses[] relations
- `src/lib/expenseUtils.js` — category catalog, stat computations, formatting helpers
- `src/components/ui/ExpenseForm.jsx` — add/edit modal (portaled to body, same design language as PricingRuleForm / MaintenanceIssueForm)
- `src/components/views/ExpensesView.jsx` — the main view (hero + category strip + list)

**Modified:**
- `api/admin-resources.js` — added expensesHandler + dispatcher registration
- `src/context/DataContext.jsx` — added expenses state, fetchExpenses, createExpense, updateExpense, deleteExpense, auto-fetch on mount, provider value
- `src/components/layout/Layout.jsx` — imported ExpensesView, added 'expenses' view registration, added `canViewAnalytics` gate in GATED_VIEW_PERM
- `src/components/layout/Sidebar.jsx` — added ArrowDownCircle import + المصروفات sidebar item between المستحقات and الصيانة
- `src/components/layout/MobileMoreMenu.jsx` — added المصروفات menu item, same position

## Install

```bash
unzip -o rentflow-expenses-phase1a.zip -d .
cp -r patch/prisma  ./
cp -r patch/api     ./
cp -r patch/src     ./
rm -rf patch rentflow-expenses-phase1a.zip

git add -A
git commit -m "expenses phase 1a: schema + API + ExpensesView + ExpenseForm + sidebar integration"
git push origin design-md-changes
```

Vercel will auto-run `prisma db push` on deploy, so the new `Expense` table gets created on Postgres automatically.

## After deploy — what to verify

1. **Sidebar (desktop)** — you should see "المصروفات" between "المستحقات" and "الصيانة" with the ArrowDownCircle icon
2. **More menu (mobile)** — same tab appears in the More menu
3. **Empty state** — the page loads with a dashed-empty-state card inviting "إضافة أول مصروف" (add your first expense). Buttons are functional
4. **Add a test expense** — tap the button, fill title + amount + date, pick a category. Save. It should appear immediately in the ledger, and the monthly total in the hero should update
5. **Add another with `متكرر` toggled** — should show a "شهري" or "سنوي" badge inline in the list metadata
6. **Filter chips** — switch between "هذا الشهر / الربع / السنة / الكل" — list should update. Category filter should also work
7. **Edit / delete** — edit button opens the form pre-populated; delete asks for confirmation
8. **Mobile** — the category strip should scroll horizontally at the top. Hero adapts. Form modal is a bottom sheet
9. **Permissions** — as a non-admin staff member without `canViewAnalytics`, the tab should not appear in the sidebar

## What Phase 1b will bring

Once you've had a day or two to use this and confirm the basic feel is right, I'll ship 1b with the migration. That way if 1a needs adjustments (different categories, different labels, different layout), we tune before importing the historical data.

Design and approach questions welcome. If the category list needs different values, or the sparkline should be somewhere else, or you want a different signature — say so, we adjust before Phase 1b.
