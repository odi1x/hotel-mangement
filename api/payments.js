import prisma from '../prisma.js';
import { verifyToken, cors } from '../utils.js';
import { notify, isLargeAmount } from '../notify.js';

/**
 * /api/payments
 *
 * GET    ?bookingId=â€¦        â†’ list payments for one booking (newest first)
 * POST   { bookingId, amount, method, type, date?, notes? }
 * DELETE ?id=â€¦                â†’ remove one entry (admin only)
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
        return res.status(400).json({ message: 'bookingId ÙˆØ§Ù„Ù…Ø¨Ù„Øº Ù…Ø·Ù„ÙˆØ¨Ø§Ù†' });
      }

      const parsedAmount = parseFloat(amount);
      if (Number.isNaN(parsedAmount) || parsedAmount === 0) {
        return res.status(400).json({ message: 'Ø§Ù„Ù…Ø¨Ù„Øº ØºÙŠØ± ØµØ§Ù„Ø­' });
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

      const owner = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { largeAmountAlertThreshold: true, largeAmountAlertRatio: true }
      });
      const large = isLargeAmount(finalAmount, booking.totalPrice, owner);

      if (user.userId !== targetUserId) {
        const label = finalType === 'refund' ? 'Ø§Ø³ØªØ±Ø¯Ø§Ø¯' : 'Ø¯ÙØ¹Ø© Ø¬Ø¯ÙŠØ¯Ø©';
        const title = finalType === 'refund'
          ? (large ? 'Ø§Ø³ØªØ±Ø¯Ø§Ø¯ ÙƒØ¨ÙŠØ±' : 'Ø§Ø³ØªØ±Ø¯Ø§Ø¯')
          : (large ? 'Ø¯ÙØ¹Ø© ÙƒØ¨ÙŠØ±Ø©' : 'Ø¯ÙØ¹Ø© Ø¬Ø¯ÙŠØ¯Ø©');

        await notify({
          userIds: [targetUserId],
          title,
          message: `${user.name || user.username} Ø³Ø¬Ù‘Ù„ ${label} Ø¨Ù‚ÙŠÙ…Ø© ${Math.abs(finalAmount)} Ø±.Ø³ Ù„Ù„Ù†Ø²ÙŠÙ„ ${booking.residentName} â€” ${booking.apartment.name}${large ? ' (Ù…Ø¨Ù„Øº Ù…Ø±ØªÙØ¹)' : ''}`,
          type: finalType === 'refund' ? 'warning' : 'payment',
          link: 'balances',
          tag: `payment:${payment.id}`
        });

        if (finalType === 'refund' && large) {
          await notify({
            permission: 'canViewBalances',
            ownerId: targetUserId,
            excludeUserId: user.userId,
            title: 'Ø§Ø³ØªØ±Ø¯Ø§Ø¯ ÙƒØ¨ÙŠØ± ÙŠØ­ØªØ§Ø¬ Ù…Ø±Ø§Ø¬Ø¹Ø©',
            message: `${user.name || user.username} Ø³Ø¬Ù‘Ù„ Ø§Ø³ØªØ±Ø¯Ø§Ø¯ Ø¨Ù‚ÙŠÙ…Ø© ${Math.abs(finalAmount)} Ø±.Ø³ Ø¹Ù„Ù‰ Ø­Ø¬Ø² ${booking.residentName}`,
            type: 'warning',
            link: 'balances',
            tag: `payment-large:${payment.id}`
          });
        }
      }

      const paidTotal = [...booking.payments, payment].reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const bookingTotal = Number(booking.totalPrice || 0);
      if (finalType === 'payment' && bookingTotal > 0 && paidTotal >= bookingTotal - 0.01) {
        await notify({
          userIds: [targetUserId],
          title: 'ØªÙ… Ø³Ø¯Ø§Ø¯ Ø§Ù„Ø­Ø¬Ø² Ø¨Ø§Ù„ÙƒØ§Ù…Ù„',
          message: `Ø³ÙØ¯Ø¯ Ø­Ø¬Ø² ${booking.residentName} ÙÙŠ ÙˆØ­Ø¯Ø© ${booking.apartment.name} Ø¨Ø§Ù„ÙƒØ§Ù…Ù„ (${bookingTotal} Ø±.Ø³).`,
          type: 'success',
          link: 'balances',
          tag: `booking-settled:${bookingId}`
        });
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

      // Only admin can delete a payment entry â€” protects the ledger
      if (user.userId !== targetUserId && !user.canDelete) {
        return res.status(403).json({ message: 'ØµÙ„Ø§Ø­ÙŠØ© Ø§Ù„Ø­Ø°Ù ØºÙŠØ± Ù…ØªØ§Ø­Ø©' });
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
