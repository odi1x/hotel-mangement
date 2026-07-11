# Rent Flow — Payments & Balance Tracking Patch

This patch adds:
- A `Payment` table + `/api/payments` endpoint
- Payment status badge on every booking row
- A ledger modal to add/view/delete payments
- A new **المستحقات** (Dues) sidebar tab with a live badge
- Updated print doc with a payments section, balance-due line, and paid/unpaid stamp

The zip is structured to mirror your repo. Unzipping it at the repo root
will overwrite the changed files and add the new ones.

## 1. Backup (optional but recommended)

```bash
cd path/to/hotel-mangement
git checkout -b feature/payments-tracking
```

## 2. Unzip into the repo root

```bash
# Move the zip into the repo folder first, then:
cd path/to/hotel-mangement
unzip -o rentflow-payments-patch.zip
```

`-o` overwrites without asking. The `rentflow-payments-patch/` folder inside
the zip mirrors your repo tree, so files land at their correct paths.

If your `unzip` puts everything inside a `rentflow-payments-patch/` folder
instead of merging into the root, run this instead:

```bash
unzip -o rentflow-payments-patch.zip
cp -r rentflow-payments-patch/* .
rm -rf rentflow-payments-patch
```

## 3. Verify the files landed

```bash
git status
```

You should see 12 files touched:

**New files (6):**
- `api/payments.js`
- `src/lib/paymentUtils.js`
- `src/components/ui/PaymentStatusBadge.jsx`
- `src/components/ui/PaymentLedgerModal.jsx`
- `src/components/views/BalancesView.jsx`
- `README-payments-patch.md` (this file — feel free to delete)

**Modified files (6):**
- `prisma/schema.prisma`
- `api/bookings.js`
- `src/context/DataContext.jsx`
- `src/components/ui/PrintAgreement.jsx`
- `src/components/views/ResidentsView.jsx`
- `src/components/layout/Sidebar.jsx`
- `src/components/layout/Layout.jsx`

## 4. Test the build locally

```bash
npm run build
```

Your build script runs `prisma db push && vite build`, so the `Payment` table
gets created automatically on your database. No manual migration needed.

## 5. Commit

```bash
git add .
git commit -m "feat(payments): add payments & balance tracking

- New Payment model (Prisma) with amount, method, type, date, collectedBy
- /api/payments endpoint (GET/POST/DELETE) with ownership checks
- Payment status badge on booking rows (paid / partial / unpaid)
- Ledger modal (receipt-tape UI) to record and review payments
- New Balances (المستحقات) sidebar tab — dues queue with badge count
- PrintAgreement now shows payments table + balance-due line + status stamp
- Refunds recorded as negative-amount entries to keep ledger integrity"
```

## 6. Push and deploy

```bash
git push origin feature/payments-tracking
```

Vercel will run `prisma db push` on deploy, which adds the `Payment` table
and its indexes automatically.

## What if I want to roll back?

```bash
git checkout main
git branch -D feature/payments-tracking
```

The `Payment` table stays in your database but is unused. If you want to
drop it too:

```sql
DROP TABLE "Payment";
```
