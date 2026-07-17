# Rent Flow — Staff Permissions for New Tabs

6 files. Closes the real gap I left when I shipped Features 1 and 3.

## What was missing

When I shipped the three new tabs — **المستحقات**, **الصيانة**, **الأسعار الموسمية** — I added them to the sidebar without permission gates. Every staff member could see all three, including the pricing strategy. That's not what you wanted, and I should have added the permission plumbing at the time.

**Notifications were covered** (staff → admin notifications on maintenance issues and payment records were part of the Feature 1/3 patches), but the visibility gating was missing.

## What changed

### 1. Schema — three new permission fields

```
canViewBalances     Boolean  @default(true)
canViewMaintenance  Boolean  @default(true)
canViewPricing      Boolean  @default(true)
```

All default `true` at the DB level, which means when Vercel's `prisma db push` runs, **every existing staff member automatically gets access to all three tabs** — nothing changes for them until you decide to revoke. This is the safe migration path.

### 2. StaffFormModal — three new toggles

Added to the permissions checklist in the staff form:

| Permission | Title | Default for NEW staff |
|---|---|---|
| `canViewBalances` | إدارة المستحقات | ✅ true (operational — staff record payments) |
| `canViewMaintenance` | إدارة الصيانة | ✅ true (operational — staff report issues) |
| `canViewPricing` | إدارة الأسعار الموسمية | ⛔ false (sensitive — reveals pricing strategy) |

The pattern here matches the existing conventions:
- Operational permissions (things staff need to do their job) default on
- Sensitive permissions (revenue data, business strategy) default off — admin must explicitly grant

`canViewPricing` defaults **off** for new staff because pricing rules reveal your competitive strategy. If a staff member joins and you want them on that side, flip it on when creating them.

Order in the form: operational permissions grouped together, then sensitive/admin ones at the bottom. Same layout you already have.

### 3. Sidebar — three tabs gated

Each of the three tabs now has `(user?.role === 'admin' || user?.permissions?.canViewXxx)` gating, matching the same pattern already used for `canViewAnalytics` and `canViewSettings`.

If a staff member has `canViewBalances: false`, the المستحقات item disappears from their sidebar. Same for the other two.

### 4. Layout — setView guard at the source

Even with the sidebar hiding gated tabs, there are still edge cases where an unauthorized view could get set (stale local state, direct manipulation, admin revokes permission mid-session). Wrapped `setView` in a permission check that silently no-ops if the target view is gated and the user doesn't have permission. Admin always bypasses.

Cleaner than a `useEffect` that reactively corrects the view — the guard now runs at the source, not as a side effect.

### 5. `api/staff.js` — pass the three new fields on GET / POST / PUT

The staff API was explicitly destructuring each permission field from `req.body` (not spreading), so the new fields wouldn't have flowed through without an update. Added to:
- **GET** `/api/staff` — the returned staff list now includes `canViewBalances`, `canViewMaintenance`, `canViewPricing` (so the form loads with correct values when editing)
- **POST** `/api/staff` — accepts and stores the three new fields on creation
- **PUT** `/api/staff` — accepts and updates the three new fields on edit

### 6. `api/auth.js` — expose new permissions to the client on login

Four places in `api/auth.js` compose the `user.permissions` object returned to the client (login, register, refresh, /me). Each now includes the three new fields. Without this, even if the DB had them, the client-side `user.permissions.canViewBalances` would be `undefined`, defaulting to falsy — and staff would lose access after login.

## Install

```bash
unzip -o rentflow-staff-permissions.zip -d .
cp -r patch/api             ./
cp -r patch/prisma          ./
cp -r patch/src             ./
rm -rf patch rentflow-staff-permissions.zip

git add -A
git commit -m "feat: staff permission gating for balances/maintenance/pricing tabs"
git push origin design-md-changes
```

Vercel will run `prisma db push` during the build, which adds the three new columns to the User table with `@default(true)` — no data migration needed, existing staff automatically get access to all three tabs.

## After deploy

**Verify migration ran:**
- Go to Settings → Staff management. Open any existing staff member's edit form. The three new toggles (إدارة المستحقات, إدارة الصيانة, إدارة الأسعار الموسمية) should be visible and ON by default (because their DB field defaulted to true).

**Test gating:**
- Create a test staff member with `canViewPricing` OFF. Log in as that staff member. The الأسعار الموسمية tab should not appear in the sidebar.
- Or edit an existing staff member and turn off `canViewBalances`. Log them out and back in (or refresh). المستحقات should disappear from their sidebar.

**Test the edge case:**
- Log in as a staff member with all three permissions on, open the الأسعار الموسمية tab. In another browser tab (as admin), edit that staff member and revoke `canViewPricing`. The staff member's tab stays where it is (they still see pricing until they navigate away) — but if they click الأسعار الموسمية in the sidebar it won't appear because the sidebar re-renders on user change, AND if they try to navigate via any other mechanism, `setView` will silently no-op. So worst case they finish what they're doing on the current view, and next navigation locks them out.

## What I did NOT change

**Server-side permission enforcement.** The existing pattern in this codebase gates at the client — `api/pricing-rules.js` doesn't currently check `canViewPricing` before returning rules, same as `api/analytics.js` doesn't check `canViewAnalytics`. I followed that same pattern for consistency. If a technically-savvy staff member wanted to hit `/api/pricing-rules` directly with a token, they could still see the data.

If you want defense-in-depth server-side checks, that's a separate hardening pass — say the word and I'll add explicit permission checks in the four API handlers (pricing-rules, admin-resources for maintenance, payments, and analytics).

## Files touched

- `prisma/schema.prisma` — 3 new fields
- `api/auth.js` — 4 permissions blocks updated
- `api/staff.js` — GET / POST / PUT updated
- `src/components/layout/Layout.jsx` — setView guard
- `src/components/layout/Sidebar.jsx` — 3 tabs gated
- `src/components/ui/StaffFormModal.jsx` — 3 new toggles + defaults
