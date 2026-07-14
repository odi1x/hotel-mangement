import prisma from '../prisma.js';
import { verifyToken, cors } from '../utils.js';

/**
 * /api/pricing-rules
 *
 * GET                          → all rules for the account (used by UI + booking form)
 * POST   { label, startDate, endDate, priceMode, value, priority?, color?, apartmentId? }
 * PUT    { id, ...fields }
 * DELETE ?id=…
 *
 * apartmentId=null means the rule applies to all apartments.
 */
export default async function handler(req, res) {
  if (cors(req, res)) return;

  const user = verifyToken(req);
  if (!user) return res.status(401).json({ message: 'Unauthorized' });

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
      const { label, startDate, endDate, priceMode, value, priority, color, apartmentId } = req.body;

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

      // If apartmentId is provided, verify ownership
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
    console.error('Pricing Rules API Error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}
