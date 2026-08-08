import prisma from '../prisma.js';
import { verifyToken, cors } from '../utils.js';
import { sendWebPush } from '../push-helper.js';

/**
 * /api/admin-resources?resource=maintenance      → maintenance CRUD
 * /api/admin-resources?resource=pricing-rules    → pricing rules CRUD
 *
 * Consolidated into a single serverless function to fit Vercel Hobby's
 * 12-function cap. Each resource's handler is identical to what it would be
 * as a standalone file — the only thing different is routing at the top.
 *
 * If you upgrade to Pro later and want to split these back into separate files,
 * copy each handler function back to its own /api/{resource}.js file with the
 * same imports, and revert the URL changes in DataContext.jsx.
 */
export default async function handler(req, res) {
  if (cors(req, res)) return;

  const user = verifyToken(req);
  if (!user) return res.status(401).json({ message: 'Unauthorized' });

  const { resource } = req.query;

  if (resource === 'maintenance')    return maintenanceHandler(req, res, user);
  if (resource === 'pricing-rules')  return pricingRulesHandler(req, res, user);
  if (resource === 'expenses')       return expensesHandler(req, res, user);
  if (resource === 'cleaning')       return cleaningHandler(req, res, user);

  return res.status(400).json({ message: 'Unknown resource. Use ?resource=maintenance | pricing-rules | expenses | cleaning' });
}

/* ------------------------------------------------------------------------- */
/*  MAINTENANCE                                                              */
/* ------------------------------------------------------------------------- */
async function maintenanceHandler(req, res, user) {
  const targetUserId = user.adminId || user.userId;

  try {
    if (req.method === 'GET') {
      const { apartmentId, status, severity } = req.query;
      const where = { userId: targetUserId };
      if (apartmentId) where.apartmentId = apartmentId;
      if (status) where.status = status;
      if (severity) where.severity = severity;

      const issues = await prisma.maintenanceIssue.findMany({
        where,
        orderBy: [{ status: 'asc' }, { reportedAt: 'desc' }]
      });
      return res.status(200).json(issues);
    }

    if (req.method === 'POST') {
      const { apartmentId, title, description, category, severity, cost, contractor, notes } = req.body;

      if (!apartmentId || !title) {
        return res.status(400).json({ message: 'الشقة والعنوان مطلوبان' });
      }

      const apartment = await prisma.apartment.findUnique({ where: { id: apartmentId } });
      if (!apartment || apartment.userId !== targetUserId) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      const issue = await prisma.maintenanceIssue.create({
        data: {
          apartmentId,
          userId: targetUserId,
          title,
          description: description || null,
          category: category || 'other',
          severity: severity || 'normal',
          status: 'open',
          reportedBy: user.name || user.username,
          cost: cost != null && cost !== '' ? parseFloat(cost) : null,
          contractor: contractor || null,
          notes: notes || null
        }
      });

      // Create-time is rarely 'resolved', but call the sync anyway — it's
      // a no-op if the issue isn't resolved with cost. Keeps the invariant
      // "every resolved-with-cost issue has a matching Expense row" true.
      await syncMaintenanceExpense(issue);

      if (user.userId !== targetUserId) {
        const isUrgent = (severity || 'normal') === 'urgent';
        await prisma.notification.create({
          data: {
            userId: targetUserId,
            title: isUrgent ? 'بلاغ صيانة عاجل' : 'بلاغ صيانة جديد',
            message: `${user.name || user.username} أبلغ عن مشكلة "${title}" في وحدة ${apartment.name}`,
            type: isUrgent ? 'warning' : 'info'
          }
        });
        await sendWebPush(
          targetUserId,
          isUrgent ? 'بلاغ صيانة عاجل' : 'بلاغ صيانة جديد',
          `${user.name || user.username} أبلغ عن مشكلة في وحدة ${apartment.name}`
        );
      }

      return res.status(201).json(issue);
    }

    if (req.method === 'PUT') {
      const { id, ...updates } = req.body;
      if (!id) return res.status(400).json({ message: 'id is required' });

      const existing = await prisma.maintenanceIssue.findUnique({ where: { id } });
      if (!existing || existing.userId !== targetUserId) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      const data = { ...updates };
      if (updates.status === 'resolved' && existing.status !== 'resolved') {
        data.resolvedAt = new Date();
      }
      if (updates.status && updates.status !== 'resolved') {
        data.resolvedAt = null;
      }
      if (data.cost != null && data.cost !== '') {
        data.cost = parseFloat(data.cost);
      } else if ('cost' in data) {
        data.cost = null;
      }

      delete data.id;
      delete data.userId;
      delete data.apartmentId;
      delete data.reportedAt;
      delete data.createdAt;

      const issue = await prisma.maintenanceIssue.update({ where: { id }, data });
      // Sync the linked Expense row. Creates it if now resolved with cost,
      // updates it if already existed, deletes it if issue was unresolved
      // or cost was cleared. All logic lives in the helper.
      await syncMaintenanceExpense(issue);
      return res.status(200).json(issue);
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ message: 'id is required' });

      const existing = await prisma.maintenanceIssue.findUnique({ where: { id } });
      if (!existing || existing.userId !== targetUserId) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      await prisma.maintenanceIssue.delete({ where: { id } });
      return res.status(204).end();
    }

    return res.status(405).json({ message: 'Method Not Allowed' });
  } catch (error) {
    console.error('Maintenance handler error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}

/* ------------------------------------------------------------------------- */
/*  PRICING RULES                                                            */
/* ------------------------------------------------------------------------- */
async function pricingRulesHandler(req, res, user) {
  const targetUserId = user.adminId || user.userId;

  try {
    if (req.method === 'GET') {
      const rules = await prisma.pricingRule.findMany({
        where: { userId: targetUserId },
        orderBy: [{ startDate: 'asc' }]
      });
      return res.status(200).json(rules);
    }

    if (req.method === 'POST') {
      const { label, startDate, endDate, priceMode, value, priority, color, apartmentId, daysOfWeek } = req.body;

      if (!label || !startDate || !endDate || value == null || value === '') {
        return res.status(400).json({ message: 'الاسم والتواريخ والقيمة مطلوبة' });
      }

      const mode = priceMode || 'multiplier';
      if (mode !== 'fixed' && mode !== 'multiplier') {
        return res.status(400).json({ message: 'نوع السعر غير صالح' });
      }

      const parsedValue = parseFloat(value);
      if (Number.isNaN(parsedValue) || parsedValue <= 0) {
        return res.status(400).json({ message: 'القيمة يجب أن تكون أكبر من الصفر' });
      }

      const start = new Date(startDate);
      const end = new Date(endDate);
      if (end < start) {
        return res.status(400).json({ message: 'تاريخ النهاية قبل تاريخ البداية' });
      }

      // Sanitize daysOfWeek — must be array of ints 0-6, unique
      let dow = [];
      if (Array.isArray(daysOfWeek)) {
        const seen = new Set();
        for (const d of daysOfWeek) {
          const n = Number(d);
          if (Number.isInteger(n) && n >= 0 && n <= 6 && !seen.has(n)) {
            seen.add(n);
            dow.push(n);
          }
        }
      }

      if (apartmentId) {
        const apt = await prisma.apartment.findUnique({ where: { id: apartmentId } });
        if (!apt || apt.userId !== targetUserId) {
          return res.status(403).json({ message: 'Forbidden' });
        }
      }

      const rule = await prisma.pricingRule.create({
        data: {
          userId: targetUserId,
          apartmentId: apartmentId || null,
          label,
          startDate: start,
          endDate: end,
          priceMode: mode,
          value: parsedValue,
          priority: priority != null ? Number(priority) : 50,
          daysOfWeek: dow,
          color: color || '#059669'
        }
      });
      return res.status(201).json(rule);
    }

    if (req.method === 'PUT') {
      const { id, ...updates } = req.body;
      if (!id) return res.status(400).json({ message: 'id is required' });

      const existing = await prisma.pricingRule.findUnique({ where: { id } });
      if (!existing || existing.userId !== targetUserId) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      const data = { ...updates };
      if (data.startDate) data.startDate = new Date(data.startDate);
      if (data.endDate) data.endDate = new Date(data.endDate);
      if (data.value != null && data.value !== '') data.value = parseFloat(data.value);
      if (data.priority != null) data.priority = Number(data.priority);

      // Sanitize daysOfWeek on update — same rules as POST
      if ('daysOfWeek' in data) {
        const dow = [];
        if (Array.isArray(data.daysOfWeek)) {
          const seen = new Set();
          for (const d of data.daysOfWeek) {
            const n = Number(d);
            if (Number.isInteger(n) && n >= 0 && n <= 6 && !seen.has(n)) {
              seen.add(n);
              dow.push(n);
            }
          }
        }
        data.daysOfWeek = dow;
      }

      delete data.id;
      delete data.userId;
      delete data.createdAt;

      const rule = await prisma.pricingRule.update({ where: { id }, data });
      return res.status(200).json(rule);
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ message: 'id is required' });

      const existing = await prisma.pricingRule.findUnique({ where: { id } });
      if (!existing || existing.userId !== targetUserId) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      await prisma.pricingRule.delete({ where: { id } });
      return res.status(204).end();
    }

    return res.status(405).json({ message: 'Method Not Allowed' });
  } catch (error) {
    console.error('Pricing rules handler error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}

/* ------------------------------------------------------------------------- */
/*  EXPENSES                                                                 */
/* ------------------------------------------------------------------------- */
async function expensesHandler(req, res, user) {
  const targetUserId = user.adminId || user.userId;

  try {
    if (req.method === 'GET') {
      const { category, scope, from, to, apartmentId } = req.query;
      const where = { userId: targetUserId };
      if (category) where.category = category;
      if (scope) where.scope = scope;
      if (apartmentId) where.apartmentId = apartmentId;
      if (from || to) {
        where.date = {};
        if (from) where.date.gte = new Date(from);
        if (to)   where.date.lte = new Date(to);
      }

      // Backfill maintenance-linked expenses when needed. Only triggers if
      // there are resolved maintenance issues with cost > 0 that don't yet
      // have their linked Expense row. This is idempotent — the helper
      // skips issues that already have a linked expense.
      const filterActive = category || scope || apartmentId || from || to;
      if (!filterActive) {
        const unlinkableCount = await prisma.maintenanceIssue.count({
          where: {
            userId: targetUserId,
            status: 'resolved',
            cost: { not: null },
          },
        });
        if (unlinkableCount > 0) {
          const linkedCount = await prisma.expense.count({
            where: { userId: targetUserId, sourceType: 'maintenance' },
          });
          if (linkedCount < unlinkableCount) {
            await runInitialMigration(targetUserId);
          }
        }
      }

      const rows = await prisma.expense.findMany({
        where,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      });
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const {
        title, amount, date, category, scope,
        apartmentId, vendor, notes, receiptUrl,
        isRecurring, recurringPeriod, recurringUntil,
        sourceType, sourceRefId,
      } = req.body || {};

      if (!title || amount == null || !date) {
        return res.status(400).json({ message: 'title, amount, and date are required' });
      }

      const created = await prisma.expense.create({
        data: {
          userId: targetUserId,
          title: String(title).trim(),
          amount,
          date: new Date(date),
          category: category || 'other',
          scope: scope || 'global',
          apartmentId: (scope === 'unit' && apartmentId) ? apartmentId : null,
          vendor: vendor || null,
          notes: notes || null,
          receiptUrl: receiptUrl || null,
          isRecurring: !!isRecurring,
          recurringPeriod: isRecurring ? (recurringPeriod || 'monthly') : null,
          recurringUntil: recurringUntil ? new Date(recurringUntil) : null,
          sourceType: sourceType || 'manual',
          sourceRefId: sourceRefId || null,
        },
      });
      return res.status(201).json(created);
    }

    if (req.method === 'PUT') {
      const { id, ...data } = req.body || {};
      if (!id) return res.status(400).json({ message: 'id required' });

      // Confirm the row belongs to this owner before updating
      const existing = await prisma.expense.findUnique({ where: { id } });
      if (!existing || existing.userId !== targetUserId) {
        return res.status(404).json({ message: 'Not found' });
      }

      const updateData = {};
      if ('title' in data)           updateData.title = String(data.title).trim();
      if ('amount' in data)          updateData.amount = data.amount;
      if ('date' in data)            updateData.date = new Date(data.date);
      if ('category' in data)        updateData.category = data.category;
      if ('scope' in data) {
        updateData.scope = data.scope;
        // Clear apartmentId when scope changes away from 'unit'
        if (data.scope !== 'unit') updateData.apartmentId = null;
      }
      if ('apartmentId' in data)     updateData.apartmentId = data.apartmentId || null;
      if ('vendor' in data)          updateData.vendor = data.vendor || null;
      if ('notes' in data)           updateData.notes = data.notes || null;
      if ('receiptUrl' in data)      updateData.receiptUrl = data.receiptUrl || null;
      if ('isRecurring' in data) {
        updateData.isRecurring = !!data.isRecurring;
        if (!data.isRecurring) {
          updateData.recurringPeriod = null;
          updateData.recurringUntil = null;
        }
      }
      if ('recurringPeriod' in data) updateData.recurringPeriod = data.recurringPeriod || null;
      if ('recurringUntil' in data)  updateData.recurringUntil = data.recurringUntil ? new Date(data.recurringUntil) : null;

      const updated = await prisma.expense.update({ where: { id }, data: updateData });
      return res.status(200).json(updated);
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ message: 'id required' });

      const existing = await prisma.expense.findUnique({ where: { id } });
      if (!existing || existing.userId !== targetUserId) {
        return res.status(404).json({ message: 'Not found' });
      }
      await prisma.expense.delete({ where: { id } });
      return res.status(204).end();
    }

    return res.status(405).json({ message: 'Method Not Allowed' });
  } catch (error) {
    console.error('Expenses handler error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}

/**
 * Backfill maintenance-linked expenses for a user. Legacy migration (from
 * StaffExpense and Apartment.rentCost) is DONE — those tables/fields no
 * longer exist after Phase 2b. What remains is: any resolved maintenance
 * issue whose linked Expense record wasn't created (edge case for issues
 * resolved before the maintenance-to-expense auto-link shipped).
 *
 * Idempotency is enforced by the caller: only runs when the user has zero
 * Expense records with sourceType='maintenance' AND unresolved maintenance
 * with cost > 0 exists. Safe to call any time.
 */
async function runInitialMigration(userId) {
  const now = new Date();

  // Historical maintenance-linked expenses. Every resolved issue with
  // cost > 0 gets a matching Expense record dated on resolvedAt. Going
  // forward the maintenance PUT/POST handler creates these live via
  // syncMaintenanceExpense — this backfills any that predate that flow.
  const maintIssues = await prisma.maintenanceIssue.findMany({
    where: { userId, status: 'resolved', cost: { not: null } },
  });

  // Skip issues that already have a linked expense (idempotency at row level).
  const existingRefs = await prisma.expense.findMany({
    where: { userId, sourceType: 'maintenance' },
    select: { sourceRefId: true },
  });
  const alreadyLinked = new Set(existingRefs.map(e => e.sourceRefId));

  const maintRows = [];
  for (const m of maintIssues) {
    if (!m.cost || Number(m.cost) <= 0) continue;
    if (alreadyLinked.has(m.id)) continue;
    maintRows.push({
      userId,
      title: m.title || 'صيانة',
      amount: m.cost,
      date: m.resolvedAt || m.updatedAt || m.createdAt || now,
      category: 'maintenance',
      scope: 'unit',
      apartmentId: m.apartmentId,
      vendor: m.contractor || null,
      notes: m.description || null,
      isRecurring: false,
      sourceType: 'maintenance',
      sourceRefId: m.id,
    });
  }

  if (maintRows.length > 0) {
    await prisma.expense.createMany({ data: maintRows });
  }
}

/**
 * Called from maintenanceHandler after a POST/PUT that leaves the issue in
 * status='resolved' with cost > 0. Ensures there's exactly one Expense row
 * linked to the issue. Idempotent — if the issue is edited multiple times,
 * we upsert the linked expense to match current values.
 *
 * If the issue is re-opened (status changes away from resolved) or the cost
 * drops to 0/null, we DELETE the linked expense — the money didn't go out
 * yet. Design decision: expenses track money that has actually left.
 */
export async function syncMaintenanceExpense(issue) {
  if (!issue?.id || !issue?.userId) return;

  const shouldExist = issue.status === 'resolved' && issue.cost != null && Number(issue.cost) > 0;
  const existing = await prisma.expense.findFirst({
    where: {
      userId: issue.userId,
      sourceType: 'maintenance',
      sourceRefId: issue.id,
    },
  });

  if (!shouldExist) {
    if (existing) {
      await prisma.expense.delete({ where: { id: existing.id } });
    }
    return;
  }

  const data = {
    userId: issue.userId,
    title: issue.title || 'صيانة',
    amount: issue.cost,
    date: issue.resolvedAt || issue.updatedAt || new Date(),
    category: 'maintenance',
    scope: 'unit',
    apartmentId: issue.apartmentId,
    vendor: issue.contractor || null,
    notes: issue.description || null,
    isRecurring: false,
    sourceType: 'maintenance',
    sourceRefId: issue.id,
  };

  if (existing) {
    await prisma.expense.update({ where: { id: existing.id }, data });
  } else {
    await prisma.expense.create({ data });
  }
}

/* ------------------------------------------------------------------------- */
/* Cleaning tasks                                                            */
/* ------------------------------------------------------------------------- */

// Fixed vocabulary for the areas grid. Frontend renders icons + labels
// keyed off these values. Adding a new area = update this list + the
// frontend's AREA_META object.
const CLEANING_AREAS = ['bathroom', 'kitchen', 'bedroom', 'living_room', 'entrance', 'supplies', 'general', 'other'];

/**
 * Cleaning tasks handler.
 *
 * GET    ?resource=cleaning                → list all tasks for owner
 * POST   ?resource=cleaning                → create task manually (admin)
 * PUT    ?resource=cleaning&id=<id>        → update task (checklist, notes, status, complete)
 * DELETE ?resource=cleaning&id=<id>        → delete task (admin only)
 *
 * Permission: `canClean` OR admin role to interact with tasks.
 * Reads (GET) are broadly allowed to any authenticated user under the owner
 *   — the sidebar controls visibility, but if someone hits the endpoint
 *   directly, they get an empty list rather than a leak.
 *
 * Auto-backfill on first GET: if there are apartments with needsCleaning=true
 * but no active task rows, we create tasks for them so the new Cleaning tab
 * shows something on day one.
 */
async function cleaningHandler(req, res, user) {
  const targetUserId = user.adminId || user.userId;
  const canClean = user.role === 'admin' || user.canClean === true;

  try {
    if (req.method === 'GET') {
      // Backfill: create tasks for currently-flagged apartments that don't
      // already have an active task. One-time on first call after deploy.
      await backfillCleaningTasks(targetUserId);

      const tasks = await prisma.cleaningTask.findMany({
        where: { userId: targetUserId },
        include: {
          apartment: { select: { id: true, name: true, type: true } },
          starter: { select: { id: true, name: true, username: true } },
          completer: { select: { id: true, name: true, username: true } },
          booking: { select: { id: true, endDate: true, residentName: true } },
        },
        orderBy: [{ status: 'asc' }, { dueBy: 'asc' }, { scheduledFor: 'desc' }],
      });
      return res.status(200).json(tasks);
    }

    if (!canClean) {
      return res.status(403).json({ message: 'Forbidden: cleaning permission required' });
    }

    if (req.method === 'POST') {
      // Manual task creation (admin ad-hoc). Fields expected: apartmentId,
      // optional checklist array, optional notes, optional dueBy.
      const { apartmentId, checklist, notes, dueBy } = req.body || {};
      if (!apartmentId) return res.status(400).json({ message: 'apartmentId required' });

      // Verify apartment ownership.
      const apt = await prisma.apartment.findFirst({
        where: { id: apartmentId, userId: targetUserId },
      });
      if (!apt) return res.status(404).json({ message: 'Apartment not found' });

      const task = await prisma.cleaningTask.create({
        data: {
          userId: targetUserId,
          apartmentId,
          status: 'pending',
          checklist: sanitizeChecklist(checklist),
          notes: notes || null,
          dueBy: dueBy ? new Date(dueBy) : null,
          scheduledFor: new Date(),
        },
        include: {
          apartment: { select: { id: true, name: true, type: true } },
        },
      });

      // Also flag the apartment so the "needs cleaning" badge shows.
      await prisma.apartment.update({
        where: { id: apartmentId },
        data: { needsCleaning: true },
      });

      return res.status(201).json(task);
    }

    if (req.method === 'PUT') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ message: 'Task id required' });

      // Verify ownership.
      const existing = await prisma.cleaningTask.findFirst({
        where: { id, userId: targetUserId },
      });
      if (!existing) return res.status(404).json({ message: 'Task not found' });

      const { action, checklist, notes, cleanerNotes, dueBy } = req.body || {};

      // Action semantics:
      //   'start'     → status pending → in_progress, startedBy/At recorded
      //   'complete'  → status → done, completedBy/At recorded, apartment cleared
      //   (no action) → generic edit: checklist / notes / dueBy
      if (action === 'start') {
        const updated = await prisma.cleaningTask.update({
          where: { id },
          data: {
            status: 'in_progress',
            startedBy: existing.startedBy || user.userId,
            startedAt: existing.startedAt || new Date(),
          },
        });
        return res.status(200).json(updated);
      }

      if (action === 'complete') {
        const updated = await prisma.cleaningTask.update({
          where: { id },
          data: {
            status: 'done',
            completedBy: user.userId,
            completedAt: new Date(),
            cleanerNotes: cleanerNotes ?? existing.cleanerNotes,
            checklist: checklist ? sanitizeChecklist(checklist) : existing.checklist,
          },
        });

        // Clear the "needs cleaning" flag if there are no other active tasks
        // for this apartment.
        const stillActive = await prisma.cleaningTask.count({
          where: {
            apartmentId: existing.apartmentId,
            status: { in: ['pending', 'in_progress'] },
          },
        });
        if (stillActive === 0) {
          await prisma.apartment.update({
            where: { id: existing.apartmentId },
            data: { needsCleaning: false, lastCleanedAt: new Date() },
          });
        }
        return res.status(200).json(updated);
      }

      // Generic edit (admin adjusting checklist / notes / dueBy).
      const data = {};
      if (checklist !== undefined) data.checklist = sanitizeChecklist(checklist);
      if (notes !== undefined) data.notes = notes || null;
      if (dueBy !== undefined) data.dueBy = dueBy ? new Date(dueBy) : null;
      if (cleanerNotes !== undefined) data.cleanerNotes = cleanerNotes || null;

      const updated = await prisma.cleaningTask.update({ where: { id }, data });
      return res.status(200).json(updated);
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ message: 'Task id required' });

      // Only admin can delete (irreversible action).
      if (user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });

      const existing = await prisma.cleaningTask.findFirst({
        where: { id, userId: targetUserId },
      });
      if (!existing) return res.status(404).json({ message: 'Task not found' });

      await prisma.cleaningTask.delete({ where: { id } });
      return res.status(204).end();
    }

    return res.status(405).json({ message: 'Method Not Allowed' });
  } catch (err) {
    console.error('cleaningHandler error:', err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}

/**
 * Clean up a checklist submission. Ensures it's an array of well-formed
 * items with only allowed areas, and coerces types. Silently drops
 * malformed entries rather than throwing.
 */
function sanitizeChecklist(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const area = String(item.area || '').toLowerCase();
    if (!CLEANING_AREAS.includes(area)) continue;
    // "general" area has no note by design; others allow optional note.
    const note = area === 'general' ? null : (item.note ? String(item.note).slice(0, 500) : null);
    const checked = !!item.checked;
    out.push({ area, note, checked });
  }
  return out;
}

/**
 * Create cleaning tasks for apartments currently flagged needsCleaning=true
 * that don't have an active task yet. Runs on every GET but is a no-op
 * when everything's in sync (single COUNT-check, then early return).
 *
 * This makes the Cleaning tab useful on day one — otherwise apartments
 * flagged from before this feature shipped would sit in "needs cleaning"
 * limbo without appearing in the task list.
 */
async function backfillCleaningTasks(userId) {
  // Cheap early return: if there are no dirty apartments, nothing to do.
  const dirtyCount = await prisma.apartment.count({
    where: { userId, needsCleaning: true },
  });
  if (dirtyCount === 0) return;

  // Fetch dirty apartments AND their existing active tasks in parallel.
  const [dirtyApts, activeTasks] = await Promise.all([
    prisma.apartment.findMany({
      where: { userId, needsCleaning: true },
      select: { id: true },
    }),
    prisma.cleaningTask.findMany({
      where: { userId, status: { in: ['pending', 'in_progress'] } },
      select: { apartmentId: true },
    }),
  ]);

  const withTaskSet = new Set(activeTasks.map(t => t.apartmentId));
  const needBackfill = dirtyApts.filter(a => !withTaskSet.has(a.id));
  if (needBackfill.length === 0) return;

  await prisma.cleaningTask.createMany({
    data: needBackfill.map(apt => ({
      userId,
      apartmentId: apt.id,
      status: 'pending',
      checklist: [],
      scheduledFor: new Date(),
    })),
  });
}

/**
 * Auto-create a cleaning task when a booking checks out. Called from
 * bookings.js checkout handler. Idempotent: skips if a task already
 * exists for this booking.
 */
export async function createCleaningTaskForBooking(booking, userId) {
  const existing = await prisma.cleaningTask.findFirst({
    where: { bookingId: booking.id },
  });
  if (existing) return existing;

  // If there's a next booking scheduled for this apartment, its start date
  // becomes the "due by" for this cleaning — urgency signal for the cleaner.
  const nextBooking = await prisma.booking.findFirst({
    where: {
      apartmentId: booking.apartmentId,
      startDate: { gt: booking.endDate },
      status: 'active',
    },
    orderBy: { startDate: 'asc' },
    select: { startDate: true },
  });

  return prisma.cleaningTask.create({
    data: {
      userId,
      apartmentId: booking.apartmentId,
      bookingId: booking.id,
      status: 'pending',
      checklist: [],
      scheduledFor: booking.endDate,
      dueBy: nextBooking?.startDate || null,
    },
  });
}

/**
 * Called from apartments.js when the "mark cleaned" button flips
 * needsCleaning to false. Marks any active tasks for the apartment as done.
 */
export async function completeActiveTasksForApartment(apartmentId, userId, completedByUserId) {
  const activeTasks = await prisma.cleaningTask.findMany({
    where: {
      apartmentId,
      userId,
      status: { in: ['pending', 'in_progress'] },
    },
    select: { id: true },
  });
  if (activeTasks.length === 0) return;

  await prisma.cleaningTask.updateMany({
    where: { id: { in: activeTasks.map(t => t.id) } },
    data: {
      status: 'done',
      completedBy: completedByUserId,
      completedAt: new Date(),
    },
  });
}
