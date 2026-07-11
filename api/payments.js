import prisma from '../prisma.js';
import { verifyToken, cors } from '../utils.js';
import { sendWebPush } from '../push-helper.js';

/**
 * /api/payments
 *
 * GET    ?bookingId=…        → list payments for one booking (newest first)
 * POST   { bookingId, amount, method, type, date?, notes? }
 * DELETE ?id=…                → remove one entry (admin only)
 *
 * Ownership: every payment belongs to the admin (targetUserId) that owns the booking.
 * Staff can add payments but only admins can delete them, mirroring the app's
 * existing permission pattern (canDelete).
 */
export default async function handler(req, res) {
  if (cors(req, res)) return;

  const user = verifyToken(req);
  if (!user) return res.status(401).json({ message: 'Unauthorized' });

  const targetUserId = user.adminId || user.userId;

  try {
    if (req.method === 'GET') {
      const { bookingId } = req.query;
      if (!bookingId) return res.status(400).json({ message: 'bookingId is required' });

      // Ownership check via booking
      const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
      if (!booking || booking.userId !== targetUserId) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      const payments = await prisma.payment.findMany({
        where: { bookingId },
        orderBy: { date: 'desc' }
      });
      return res.status(200).json(payments);
    }

    if (req.method === 'POST') {
      const { bookingId, amount, method, type, date, notes } = req.body;

      if (!bookingId || amount === undefined || amount === null || amount === '') {
        return res.status(400).json({ message: 'bookingId والمبلغ مطلوبان' });
      }

      const parsedAmount = parseFloat(amount);
      if (Number.isNaN(parsedAmount) || parsedAmount === 0) {
        return res.status(400).json({ message: 'المبلغ غير صالح' });
      }

      // Ownership check
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { apartment: true, payments: true }
      });
      if (!booking || booking.userId !== targetUserId) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      // Normalize: refunds are stored as negative
      const finalType = type || 'payment';
      const finalAmount = finalType === 'refund'
        ? -Math.abs(parsedAmount)
        : Math.abs(parsedAmount);

      const payment = await prisma.payment.create({
        data: {
          bookingId,
          userId: targetUserId,
          amount: finalAmount,
          method: method || 'cash',
          type: finalType,
          date: date ? new Date(date) : new Date(),
          notes: notes || null,
          collectedBy: user.name || user.username
        }
      });

      // Notify admin when staff records a payment (accountability)
      if (user.userId !== targetUserId) {
        const label = finalType === 'refund' ? 'استرداد' : 'دفعة جديدة';
        await prisma.notification.create({
          data: {
            userId: targetUserId,
            title: label,
            message: `${user.name || user.username} سجّل ${label} بقيمة ${Math.abs(finalAmount)} ر.س للنزيل ${booking.residentName} — ${booking.apartment.name}`,
            type: finalType === 'refund' ? 'warning' : 'success'
          }
        });
        await sendWebPush(
          targetUserId,
          label,
          `${user.name || user.username} سجّل ${label} بقيمة ${Math.abs(finalAmount)} ر.س للنزيل ${booking.residentName}`
        );
      }

      return res.status(201).json(payment);
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ message: 'id is required' });

      const existing = await prisma.payment.findUnique({ where: { id } });
      if (!existing || existing.userId !== targetUserId) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      // Only admin can delete a payment entry — protects the ledger
      if (user.userId !== targetUserId && !user.canDelete) {
        return res.status(403).json({ message: 'صلاحية الحذف غير متاحة' });
      }

      await prisma.payment.delete({ where: { id } });
      return res.status(204).end();
    }

    return res.status(405).json({ message: 'Method Not Allowed' });
  } catch (error) {
    console.error('Payments API Error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}
