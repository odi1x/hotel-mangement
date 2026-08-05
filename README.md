# Rent Flow — Cleaning system

A dedicated cleaning tab. Auto-generates tasks on checkout, admin can select cleaning areas from an 8-tile grid with optional per-area notes, cleaners tick through the checklist and mark done. Every completion records who did it.

## What ships

**Schema:**
- New `CleaningTask` table (apartmentId, bookingId?, status, checklist JSON, notes, timestamps, startedBy/At, completedBy/At)
- New `canClean` boolean on `User`
- Inverse relations across User, Apartment, Booking

**API — no new endpoint file. Wired through the existing multiplexer:**
- `GET /api/admin-resources?resource=cleaning` — list all tasks (with apartment + user names inlined)
- `POST` — admin ad-hoc task creation
- `PUT ?id=<id>` — actions: `start`, `complete`, or generic checklist/notes edit
- `DELETE ?id=<id>` — admin only

**Total serverless endpoints: still 11 (below Vercel's 12 free-tier limit).**

**Auto-integrations:**
- Booking checkout → auto-creates a cleaning task with `dueBy` = next check-in date
- Apartment "mark cleaned" button → completes any active task server-side (records who did it, sets `lastCleanedAt`)
- One-time backfill: on first `GET` after deploy, tasks are created for apartments currently flagged `needsCleaning: true` — so the tab is useful on day one

**Permission gating:**
- `canClean` field added to User schema
- Added to JWT payload + client permissions object
- Exposed in staff creation/edit modal as "قسم التنظيف" toggle
- Sidebar tab and view route both gated on `admin OR canClean`

**UI — new `التنظيف` tab between Expenses and Maintenance:**
- Pending-tasks list (sorted: urgent first via `dueBy`, then by schedule date)
- Filter chips: قيد التنفيذ / المكتمل / الكل
- Search by unit or notes
- Sidebar badge shows pending count
- Urgency indicator on each row: red "متأخر" if past due, gray hours/days countdown otherwise
- Completed-today stays visible in the pending view (crossed out); older completions accessible via "المكتمل" filter

**Task detail modal:**
- Admin sees 8-tile area grid: الحمام, المطبخ, غرفة النوم, الصالة, المدخل, تجديد المستلزمات, تنظيف عام, أخرى
- Selecting a tile reveals a per-area note field (except "تنظيف عام" — marker only, no note by design)
- All areas compose (general + specific areas can coexist)
- Save button persists the checklist without completing the task
- Cleaner sees the checklist as tap-to-check boxes with area label + note preview
- Optional "ملاحظات" text area for cleaner to add anything at the end
- Big "إنهاء" button; soft confirm if items are unchecked ("mark done anyway?")

**Completed view:**
- Green "مكتملة بواسطة [name]" banner with date
- Read-only checklist showing what was and wasn't ticked
- Cleaner's notes if any

**Add-task modal (admin only):**
- Pick apartment
- Optional notes
- Creates a pending task + flags the apartment `needsCleaning: true`

## What's NOT in this patch (skipped as agreed)

- **Push notifications** — I'll audit the existing push infrastructure and add cleaning-triggered pushes in a follow-up patch. The bell notifications will still fire in-app.
- **Assignment** — anyone with `canClean` sees all tasks; completedBy tracking gives you the "who did it" record without assignment overhead
- **Checklist templates / quick-apply from last cleaning**
- **Photo requirement**
- **Time tracking metrics**

## Files touched (10)

- `prisma/schema.prisma` — new model + field + relations
- `api/admin-resources.js` — full cleaning handler + exported helpers for other APIs
- `api/apartments.js` — mark-cleaned also completes tasks
- `api/bookings.js` — checkout auto-creates task
- `api/auth.js` — canClean in JWT + permissions object
- `api/staff.js` — canClean in staff CRUD
- `src/context/DataContext.jsx` — cleaningTasks state + fetch/create/update/delete
- `src/components/layout/Sidebar.jsx` — new tab + badge
- `src/components/layout/Layout.jsx` — route + gate
- `src/components/views/CleaningView.jsx` — the view itself
- `src/components/ui/StaffFormModal.jsx` — canClean toggle in staff form

## Install

```bash
unzip -o rentflow-cleaning.zip -d .
cp -r patch/. .
rm -rf patch rentflow-cleaning.zip

git add -A
git commit -m "feat: cleaning system — auto-generated tasks, admin checklist grid, cleaner UI, permission-gated"
git push origin design-md-changes
```

Vercel auto-runs `prisma db push` on deploy. This adds the `CleaningTask` table + `canClean` column. Non-destructive.

## After deploy — verify

1. **New tab in sidebar** — "التنظيف" between Expenses and Maintenance. Sparkles icon. Badge shows pending count (may show 0 initially if no apartments are flagged `needsCleaning: true`).
2. **Open the tab** — if any apartments were previously flagged as needing cleaning, they'll be backfilled as pending tasks automatically on first visit.
3. **Test auto-generation:**
   - Check out an active booking
   - Go to Cleaning tab — the unit should appear as a pending task
   - The `dueBy` should be set to the next incoming booking's start date (if any)
4. **Test admin flow:**
   - Open a task
   - Tap "ما يحتاج تنظيف إضافي" to expand the grid
   - Select 2-3 areas (say Bathroom + Kitchen + General)
   - Add notes on the ones with note fields
   - Save
5. **Test cleaner flow** (either as admin or a staff account with `canClean`):
   - Open the same task
   - Tick each checklist item
   - Tap "إنهاء"
   - Task moves to completed; unit's needsCleaning flag clears; lastCleanedAt updates
6. **Test the shortcut:** in Apartments view, tap the existing "mark cleaned" button on a dirty unit. Check Cleaning tab — that task should show as completed by you.
7. **Test permission gating:**
   - Create a staff user with `canClean: false` — they should NOT see the tab
   - Toggle canClean to true — they should see the tab
   - Log in as them — they can view/complete tasks but can't delete or add manually

## Known limitations to know about

- **No push notifications yet.** Cleaner needs to open the app to see new tasks. Push audit + integration = follow-up patch.
- **No task assignment.** If you have multiple cleaners, they all see the same task list. Whoever taps "done" first is recorded. If this becomes an issue, we can add explicit assignment later.
- **Checklist is per-task, not per-apartment template.** Admin has to re-select areas for each task. If a specific unit always needs the same extras (e.g., شقة 91's extractor fan), that gets repetitive. If it becomes annoying, we add "quick apply from last cleaning" — one small button, minimal UI.
