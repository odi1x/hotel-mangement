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

  return res.status(400).json({ message: 'Unknown resource. Use ?resource=maintenance or ?resource=pricing-rules' });
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
