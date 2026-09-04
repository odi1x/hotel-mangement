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
  if (resource === 'partners')       return partnersHandler(req, res, user);

  return res.status(400).json({ message: 'Unknown resource. Use ?resource=maintenance | pricing-rules | expenses | cleaning | partners' });
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

      // List view: exclude large images array (only needed in detail/edit modal)
      const issues = await prisma.maintenanceIssue.findMany({
        where,
        orderBy: [{ status: 'asc' }, { reportedAt: 'desc' }],
        select: {
          id: true,
          apartmentId: true,
          title: true,
          description: true,
          category: true,
          severity: true,
          status: true,
          reportedBy: true,
          cost: true,
          contractor: true,
          notes: true,
          reportedAt: true,
          resolvedAt: true,
          createdAt: true,
          updatedAt: true,
        }
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

/* ------------------------------------------------------------------------- */
/*  PARTNERS / REVENUE SHARING                                               */
/* ------------------------------------------------------------------------- */

/**
 * Revenue calculation helper — mirrors the logic in analytics.js.
 * Returns gross revenue for bookings within a date range and apartment scope.
 */
export async function calculateGrossRevenue(userId, apartmentIds, periodStart, periodEnd) {
  const where = {
    userId,
    startDate: { lt: periodEnd },
    endDate: { gt: periodStart },
  };
  if (apartmentIds.length > 0) {
    where.apartmentId = { in: apartmentIds };
  }

  const bookings = await prisma.booking.findMany({
    where,
    select: {
      id: true,
      apartmentId: true,
      pricePerNight: true,
      totalPrice: true,
      startDate: true,
      endDate: true,
    },
  });

  let gross = 0;
  const unitBreakdown = {};

  for (const b of bookings) {
    const start = new Date(b.startDate);
    const end = new Date(b.endDate);
    const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const revenue = b.totalPrice !== null
      ? Number(b.totalPrice)
      : Number(b.pricePerNight) * nights;
    gross += revenue;

    if (!unitBreakdown[b.apartmentId]) {
      unitBreakdown[b.apartmentId] = { revenue: 0, nights: 0 };
    }
    unitBreakdown[b.apartmentId].revenue += revenue;
    unitBreakdown[b.apartmentId].nights += nights;
  }

  return { gross, unitBreakdown };
}

/**
 * Expense calculation helper — mirrors the logic in analytics.js.
 * Returns total expenses for the given scope and period.
 */
export async function calculateExpenses(userId, apartmentIds, periodStart, periodEnd) {
  // 1. Per-booking fees (platform + cleaning) from bookings in scope
  const bookingWhere = {
    userId,
    startDate: { lt: periodEnd },
    endDate: { gt: periodStart },
  };
  if (apartmentIds.length > 0) {
    bookingWhere.apartmentId = { in: apartmentIds };
  }

  const bookings = await prisma.booking.findMany({
    where: bookingWhere,
    include: {
      apartment: {
        select: {
          id: true,
          platformFee: true,
          platformFeeType: true,
          cleaningFeePerStay: true,
        },
      },
    },
  });

  let feesTotal = 0;
  for (const b of bookings) {
    if (b.apartment.cleaningFeePerStay) {
      feesTotal += Number(b.apartment.cleaningFeePerStay);
    }
    if (b.apartment.platformFee) {
      const revenue = b.totalPrice !== null
        ? Number(b.totalPrice)
        : Number(b.pricePerNight) * Math.ceil((new Date(b.endDate) - new Date(b.startDate)) / (1000 * 60 * 60 * 24));
      if (b.apartment.platformFeeType === 'percentage') {
        feesTotal += revenue * (Number(b.apartment.platformFee) / 100);
      } else {
        feesTotal += Number(b.apartment.platformFee);
      }
    }
  }

  // 2. Ledger expenses (Expense model)
  const expenseWhere = {
    userId,
    date: { gte: periodStart, lte: periodEnd },
  };
  // Note: expenses with scope='global' need pro-rating based on apartment count
  // This mirrors analytics.js logic

  const expenses = await prisma.expense.findMany({
    where: expenseWhere,
    select: {
      id: true,
      amount: true,
      isRecurring: true,
      recurringPeriod: true,
      recurringUntil: true,
      date: true,
      scope: true,
      apartmentId: true,
    },
  });

  // Get apartment count for pro-rating
  const totalAptCount = await prisma.apartment.count({ where: { userId } });
  const filteredAptCount = apartmentIds.length > 0 ? apartmentIds.length : totalAptCount;
  const scopeRatio = totalAptCount > 0 ? filteredAptCount / totalAptCount : 0;

  // Helper to count occurrences of recurring expense in period
  function countOccurrences(expense, pStart, pEnd) {
    if (!expense.isRecurring || !expense.recurringPeriod) return 0;
    const start = new Date(expense.date);
    const end = expense.recurringUntil ? new Date(expense.recurringUntil) : pEnd;
    const periodEnd = end < pEnd ? end : pEnd;
    if (start > periodEnd) return 0;

    let count = 0;
    const current = new Date(start);
    while (current <= periodEnd) {
      if (current >= pStart) count++;
      if (expense.recurringPeriod === 'monthly') {
        current.setMonth(current.getMonth() + 1);
      } else if (expense.recurringPeriod === 'yearly') {
        current.setFullYear(current.getFullYear() + 1);
      } else {
        break;
      }
    }
    return count;
  }

  let ledgerTotal = 0;
  for (const e of expenses) {
    let contrib = 0;
    if (!e.isRecurring) {
      const expDate = new Date(e.date);
      if (expDate >= periodStart && expDate <= periodEnd) {
        contrib = Number(e.amount);
      }
    } else {
      const occ = countOccurrences(e, periodStart, periodEnd);
      contrib = Number(e.amount) * occ;
    }

    if (e.scope === 'unit' && e.apartmentId) {
      if (apartmentIds.length === 0 || apartmentIds.includes(e.apartmentId)) {
        ledgerTotal += contrib;
      }
    } else {
      ledgerTotal += contrib * scopeRatio;
    }
  }

  return { total: feesTotal + ledgerTotal, fees: feesTotal, ledger: ledgerTotal };
}

/**
 * Core compensation engine — single source of truth for payout calculation.
 * Returns { amount, formulaLabel, basis }.
 */
export function computePartnerCompensation(partner, basisGross, basisExpenses) {
  const basisNet = basisGross - basisExpenses;
  const pct = partner.percentage != null ? Number(partner.percentage) : 0;
  const fixed = partner.fixedAmount != null ? Number(partner.fixedAmount) : 0;

  let amount;
  let label;

  switch (partner.compType) {
    case 'percentage_gross':
      amount = basisGross * (pct / 100);
      label = `${pct}% من إجمالي الإيرادات`;
      break;
    case 'percentage_net':
      amount = basisNet * (pct / 100);
      label = `${pct}% من صافي الربح`;
      break;
    case 'fixed':
      amount = fixed;
      label = `مبلغ ثابت ${fixed.toLocaleString()} ر.س`;
      break;
    case 'fixed_percentage':
      amount = fixed + basisGross * (pct / 100);
      label = `مبلغ ثابت ${fixed.toLocaleString()} ر.س + ${pct}% من الإجمالي`;
      break;
    default:
      amount = basisGross * (pct / 100);
      label = `${pct}% من إجمالي الإيرادات`;
  }

  return {
    amount: Math.round(amount * 100) / 100,
    formulaLabel: label,
    basis: { gross: basisGross, expenses: basisExpenses, net: basisNet },
  };
}

async function partnersHandler(req, res, user) {
  const targetUserId = user.adminId || user.userId;

  // Feature flag gate — server-side enforcement
  const owner = await prisma.user.findUnique({ where: { id: targetUserId }, select: { partnersRevenueSharingEnabled: true } });
  if (!owner?.partnersRevenueSharingEnabled) {
    return res.status(403).json({ message: 'ميزة الشركاء غير مفعّلة' });
  }

  try {
    const { action, id } = req.query;

    // GET /api/admin-resources?resource=partners&action=list
    if (req.method === 'GET' && action === 'list') {
      const { status, search } = req.query;
      const where = { userId: targetUserId };
      if (status) where.status = status;
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }

      const partners = await prisma.partner.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          settlements: {
            where: { status: { not: 'void' } },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { id: true, amount: true, status: true, periodEnd: true },
          },
        },
      });

      // Add estimated payout for each partner (based on last 30 days)
      const periodEnd = new Date();
      const periodStart = new Date();
      periodStart.setDate(periodStart.getDate() - 30);

      const enriched = await Promise.all(partners.map(async (p) => {
        const aptIds = p.apartmentIds.length > 0 ? p.apartmentIds : [];
        const { gross } = await calculateGrossRevenue(targetUserId, aptIds, periodStart, periodEnd);
        const { total: expenses } = await calculateExpenses(targetUserId, aptIds, periodStart, periodEnd);
        const { amount: estimatedPayout, formulaLabel } = computePartnerCompensation(p, gross, expenses);

        return {
          ...p,
          latestSettlement: p.settlements[0] || null,
          estimatedPayout,
          formulaLabel,
        };
      }));

      return res.status(200).json(enriched);
    }

    // GET /api/admin-resources?resource=partners&id=<id> — partner detail + settlements
    if (req.method === 'GET' && !action && id) {
      const partner = await prisma.partner.findUnique({
        where: { id },
        include: {
          settlements: {
            where: { status: { not: 'void' } },
            orderBy: { createdAt: 'desc' },
            take: 20,
          },
        },
      });
      if (!partner || partner.userId !== targetUserId) {
        return res.status(404).json({ message: 'الشريك غير موجود' });
      }
      return res.status(200).json(partner);
    }

    // GET /api/admin-resources?resource=partners&action=calculate&id=<id>&periodStart&periodEnd
    // POST /api/admin-resources?resource=partners&action=calculate — for preview with form data (no saved partner needed)
    if ((req.method === 'GET' || req.method === 'POST') && action === 'calculate') {
      const { periodStart, periodEnd } = req.method === 'GET' ? req.query : req.body;
      if (!periodStart || !periodEnd) {
        return res.status(400).json({ message: 'periodStart and periodEnd required' });
      }

      let partner;
      let aptIds;

      if (req.method === 'GET') {
        // Existing partner lookup
        if (!id) return res.status(400).json({ message: 'partner id required' });
        partner = await prisma.partner.findUnique({ where: { id } });
        if (!partner || partner.userId !== targetUserId) {
          return res.status(404).json({ message: 'الشريك غير موجود' });
        }
        aptIds = partner.apartmentIds.length > 0 ? partner.apartmentIds : [];
      } else {
        // Preview with form data from request body
        const { compType, percentage, fixedAmount, apartmentIds } = req.body;
        if (!compType) return res.status(400).json({ message: 'compType required for preview' });

        // Build a temporary partner object from form data
        partner = {
          compType,
          percentage: percentage != null ? parseFloat(percentage) : null,
          fixedAmount: fixedAmount != null ? parseFloat(fixedAmount) : null,
          apartmentIds: Array.isArray(apartmentIds) ? apartmentIds : [],
        };
        aptIds = partner.apartmentIds.length > 0 ? partner.apartmentIds : [];
      }

      const { gross, unitBreakdown } = await calculateGrossRevenue(targetUserId, aptIds, new Date(periodStart), new Date(periodEnd));
      const { total: expenses, fees, ledger } = await calculateExpenses(targetUserId, aptIds, new Date(periodStart), new Date(periodEnd));
      const { amount, formulaLabel, basis } = computePartnerCompensation(partner, gross, expenses);

      return res.status(200).json({
        gross,
        expenses,
        fees,
        ledger,
        net: basis.net,
        amount,
        formulaLabel,
        unitBreakdown,
      });
    }

    // POST /api/admin-resources?resource=partners — create partner (NOT action-routed calls like settle/pay-settlements/mark-paid/void)
    if (req.method === 'POST' && !action) {
      const { name, phone, email, notes, compType, percentage, fixedAmount, apartmentIds, status, recurringPeriod } = req.body;

      if (!name) return res.status(400).json({ message: 'اسم الشريك مطلوب' });

      const type = compType || 'percentage_gross';
      const validTypes = ['percentage_gross', 'percentage_net', 'fixed', 'fixed_percentage'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ message: 'نوع التعويض غير صالح' });
      }

      // Validate based on type
      if (type === 'percentage_gross' || type === 'percentage_net' || type === 'fixed_percentage') {
        if (percentage == null || percentage === '') {
          return res.status(400).json({ message: 'النسبة المئوية مطلوبة لهذا النوع' });
        }
        const pct = Number(percentage);
        if (isNaN(pct) || pct < 0 || pct > 100) {
          return res.status(400).json({ message: 'النسبة يجب أن تكون بين 0 و 100' });
        }
      }
      if (type === 'fixed' || type === 'fixed_percentage') {
        if (fixedAmount == null || fixedAmount === '') {
          return res.status(400).json({ message: 'المبلغ الثابت مطلوب لهذا النوع' });
        }
        const amt = Number(fixedAmount);
        if (isNaN(amt) || amt < 0) {
          return res.status(400).json({ message: 'المبلغ يجب أن يكون أكبر من أو يساوي الصفر' });
        }
      }

      const partner = await prisma.partner.create({
        data: {
          userId: targetUserId,
          name: String(name).trim(),
          phone: phone || null,
          email: email || null,
          notes: notes || null,
          compType: type,
          percentage: type === 'fixed' ? null : (percentage ? parseFloat(percentage) : null),
          fixedAmount: (type === 'fixed' || type === 'fixed_percentage') ? parseFloat(fixedAmount) : null,
          apartmentIds: Array.isArray(apartmentIds) ? apartmentIds : [],
          status: status || 'active',
          recurringPeriod: ['monthly', 'quarterly', 'yearly'].includes(recurringPeriod) ? recurringPeriod : null,
        },
      });
      return res.status(201).json(partner);
    }

    // PUT /api/admin-resources?resource=partners&id=<id> — update partner
    if (req.method === 'PUT' && id) {
      const { name, phone, email, notes, compType, percentage, fixedAmount, apartmentIds, status, recurringPeriod } = req.body;

      const existing = await prisma.partner.findUnique({ where: { id } });
      if (!existing || existing.userId !== targetUserId) {
        return res.status(404).json({ message: 'الشريك غير موجود' });
      }

      // Validate type if provided
      if (compType) {
        const validTypes = ['percentage_gross', 'percentage_net', 'fixed', 'fixed_percentage'];
        if (!validTypes.includes(compType)) {
          return res.status(400).json({ message: 'نوع التعويض غير صالح' });
        }
      }

      const type = compType || existing.compType;
      const pct = percentage != null ? (percentage === '' ? null : parseFloat(percentage)) : existing.percentage;
      const fixed = fixedAmount != null ? (fixedAmount === '' ? null : parseFloat(fixedAmount)) : existing.fixedAmount;

      // Validate based on type
      if (type === 'percentage_gross' || type === 'percentage_net' || type === 'fixed_percentage') {
        if (pct == null) {
          return res.status(400).json({ message: 'النسبة المئوية مطلوبة لهذا النوع' });
        }
        if (isNaN(pct) || pct < 0 || pct > 100) {
          return res.status(400).json({ message: 'النسبة يجب أن تكون بين 0 و 100' });
        }
      }
      if (type === 'fixed' || type === 'fixed_percentage') {
        if (fixed == null) {
          return res.status(400).json({ message: 'المبلغ الثابت مطلوب لهذا النوع' });
        }
        if (isNaN(fixed) || fixed < 0) {
          return res.status(400).json({ message: 'المبلغ يجب أن يكون أكبر من أو يساوي الصفر' });
        }
      }

      const updateData = {};
      if (name !== undefined) updateData.name = String(name).trim();
      if (phone !== undefined) updateData.phone = phone || null;
      if (email !== undefined) updateData.email = email || null;
      if (notes !== undefined) updateData.notes = notes || null;
      if (compType !== undefined) updateData.compType = type;
      if (percentage !== undefined) updateData.percentage = type === 'fixed' ? null : pct;
      if (fixedAmount !== undefined) updateData.fixedAmount = (type === 'fixed' || type === 'fixed_percentage') ? fixed : null;
      if (apartmentIds !== undefined) updateData.apartmentIds = Array.isArray(apartmentIds) ? apartmentIds : [];
      if (status !== undefined) updateData.status = status;
      if (recurringPeriod !== undefined) updateData.recurringPeriod = ['monthly', 'quarterly', 'yearly'].includes(recurringPeriod) ? recurringPeriod : null;

      const updated = await prisma.partner.update({ where: { id }, data: updateData });
      return res.status(200).json(updated);
    }

    // POST /api/admin-resources?resource=partners&action=settle&id=<id>&periodStart&periodEnd&memo
    if (req.method === 'POST' && action === 'settle') {
      if (!id) return res.status(400).json({ message: 'partner id required' });
      const { periodStart, periodEnd, memo } = req.body;
      if (!periodStart || !periodEnd) {
        return res.status(400).json({ message: 'periodStart and periodEnd required' });
      }

      const partner = await prisma.partner.findUnique({ where: { id } });
      if (!partner || partner.userId !== targetUserId) {
        return res.status(404).json({ message: 'الشريك غير موجود' });
      }

      const pStart = new Date(periodStart);
      pStart.setHours(0, 0, 0, 0);
      const pEnd = new Date(periodEnd);
      pEnd.setHours(23, 59, 59, 999);

      // CONFLICT DETECTION: reject if a non-void settlement already overlaps this period
      const existing = await prisma.settlement.findFirst({
        where: {
          partnerId: partner.id,
          status: { not: 'void' },
          periodStart: { lte: pEnd },
          periodEnd: { gte: pStart },
        },
        select: { id: true, periodStart: true, periodEnd: true, status: true },
      });
      if (existing) {
        const label = `${new Date(existing.periodStart).toLocaleDateString('ar', { day: 'numeric', month: 'long' })} — ${new Date(existing.periodEnd).toLocaleDateString('ar', { day: 'numeric', month: 'long', year: 'numeric' })}`;
        return res.status(409).json({
          message: `يوجد بالفعل تسوية لهذا الشريك في الفترة (${label}). لا يمكن إنشاء تسوية تتعارض مع تسوية موجودة.`,
          existing,
        });
      }

      const aptIds = partner.apartmentIds.length > 0 ? partner.apartmentIds : [];
      const { gross } = await calculateGrossRevenue(targetUserId, aptIds, pStart, pEnd);
      const { total: expenses } = await calculateExpenses(targetUserId, aptIds, pStart, pEnd);
      const { amount, formulaLabel, basis } = computePartnerCompensation(partner, gross, expenses);

      const settlement = await prisma.settlement.create({
        data: {
          partnerId: partner.id,
          userId: targetUserId,
          partnerNameSnap: partner.name,
          compTypeSnap: partner.compType,
          percentageSnap: partner.percentage,
          fixedAmountSnap: partner.fixedAmount,
          scopeSnap: [...partner.apartmentIds],
          periodStart: pStart,
          periodEnd: pEnd,
          basisGross: gross,
          basisExpenses: expenses,
          basisNet: basis.net,
          amount,
          currency: 'sar',
          status: 'draft',
          memo: memo || null,
          source: 'manual',
        },
      });

      return res.status(201).json({ ...settlement, formulaLabel });
    }

    // POST /api/admin-resources?resource=partners&action=mark-paid&id=<settlementId>
    if (req.method === 'POST' && action === 'mark-paid') {
      const settlementId = req.query.settlementId;
      if (!settlementId) return res.status(400).json({ message: 'settlementId required' });

      const settlement = await prisma.settlement.findUnique({ where: { id: settlementId } });
      if (!settlement || settlement.userId !== targetUserId) {
        return res.status(404).json({ message: 'التسوية غير موجودة' });
      }

      const updated = await prisma.settlement.update({
        where: { id: settlementId },
        data: { status: 'paid', paidAt: new Date() },
      });
      return res.status(200).json(updated);
    }

    // POST /api/admin-resources?resource=partners&action=void-settlement&id=<settlementId>
    if (req.method === 'POST' && action === 'void-settlement') {
      const settlementId = req.query.settlementId;
      if (!settlementId) return res.status(400).json({ message: 'settlementId required' });

      const settlement = await prisma.settlement.findUnique({ where: { id: settlementId } });
      if (!settlement || settlement.userId !== targetUserId) {
        return res.status(404).json({ message: 'التسوية غير موجودة' });
      }

      const updated = await prisma.settlement.update({
        where: { id: settlementId },
        data: { status: 'void' },
      });
      return res.status(200).json(updated);
    }

    // POST /api/admin-resources?resource=partners&action=pay-settlements
    // Body: { settlementIds: [], method, date, notes }
    // Creates ONE SettlementPayment covering all selected draft settlements,
    // then marks each settlement paid and links it to the payment.
    if (req.method === 'POST' && action === 'pay-settlements') {
      const { settlementIds, method, date, notes } = req.body;
      if (!Array.isArray(settlementIds) || settlementIds.length === 0) {
        return res.status(400).json({ message: 'settlementIds (array) required' });
      }

      const settlements = await prisma.settlement.findMany({
        where: { id: { in: settlementIds }, userId: targetUserId },
      });
      if (settlements.length !== settlementIds.length) {
        return res.status(404).json({ message: 'تسوية أو أكثر غير موجودة' });
      }
      const nonDraft = settlements.find(s => s.status !== 'draft');
      if (nonDraft) {
        return res.status(409).json({ message: 'لا يمكن دفع تسوية ليست بمسودة: ' + nonDraft.partnerNameSnap });
      }

      const total = settlements.reduce((sum, s) => sum + Number(s.amount), 0);
      const paidAt = date ? new Date(date) : new Date();

      const payment = await prisma.settlementPayment.create({
        data: {
          userId: targetUserId,
          amount: Math.round(total * 100) / 100,
          method: method || 'cash',
          date: paidAt,
          notes: notes || null,
          settlements: {
            connect: settlements.map(s => ({ id: s.id })),
          },
        },
      });

      await prisma.settlement.updateMany({
        where: { id: { in: settlementIds }, userId: targetUserId },
        data: { status: 'paid', paidAt, paymentId: payment.id },
      });

      return res.status(201).json({ payment, count: settlements.length, total });
    }

    // DELETE /api/admin-resources?resource=partners&id=<id> — delete partner (cascades settlements)
    if (req.method === 'DELETE' && id) {
      const existing = await prisma.partner.findUnique({ where: { id } });
      if (!existing || existing.userId !== targetUserId) {
        return res.status(404).json({ message: 'الشريك غير موجود' });
      }

      await prisma.partner.delete({ where: { id } });
      return res.status(204).end();
    }

    return res.status(405).json({ message: 'Method Not Allowed' });
  } catch (error) {
    console.error('Partners handler error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}
