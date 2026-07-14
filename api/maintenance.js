import prisma from '../prisma.js';
import { verifyToken, cors } from '../utils.js';
import { sendWebPush } from '../push-helper.js';

/**
 * /api/maintenance
 *
 * GET    ?apartmentId=…&status=…&severity=…   → filtered list
 * POST   { apartmentId, title, category, severity, description?, cost?, contractor? }
 * PUT    { id, ...fields }   → update issue (typically status changes)
 * DELETE ?id=…
 */
export default async function handler(req, res) {
  if (cors(req, res)) return;

  const user = verifyToken(req);
  if (!user) return res.status(401).json({ message: 'Unauthorized' });

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
        orderBy: [
          // Urgent open issues first, then by report date
          { status: 'asc' },
          { reportedAt: 'desc' }
        ]
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

      // Notify admin when staff reports maintenance
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

      // If status is transitioning to resolved, stamp resolvedAt.
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

      // Drop fields the client shouldn't be able to overwrite
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
    console.error('Maintenance API Error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}
