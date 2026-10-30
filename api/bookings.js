import prisma from '../prisma.js';
import { verifyToken, cors } from '../utils.js';
import { notify, isLargeAmount } from '../notify.js';
import { createCleaningTaskForBooking } from './admin-resources.js';
import { runArrivalDepartureReminders } from '../daily-reminders.js';

// Optional tenant identity fields must never be persisted as an empty string.
// When the operator leaves them blank, store the literal string "none".
// `undefined` is preserved so partial updates don't overwrite existing data.
const optionalText = (value) => {
  if (value === undefined) return undefined;
  const trimmed = String(value).trim();
  return trimmed === '' ? 'none' : trimmed;
};

export default async function handler(req, res) {
  if (cors(req, res)) return;

  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const targetUserId = user.adminId || user.userId;

  try {
    if (req.method === 'GET') {
      const { page, limit, search, excludeCancelled, status, apartmentId, payment, today } = req.query;

      let whereClause = { userId: targetUserId };

      // Opt-in: hide soft-cancelled bookings (kept in DB with their ledger).
      if (excludeCancelled === '1') {
        whereClause.status = { not: 'cancelled' };
      }

      if (search) {
        whereClause.OR = [
          { residentName: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } }
        ];
      }

      if (apartmentId) {
        whereClause.apartmentId = apartmentId;
      }

      // Lifecycle filter. Date-based buckets ("current"/"upcoming"/"departed")
      // use the client's LOCAL day (sent as `today`) so the bucket matches
      // what the user actually sees in their timezone.
      const NON_LIVE = ['checked_out_early', 'cancelled', 'pending'];
      if (status && status !== 'all') {
        const dayStr = (typeof today === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(today))
          ? today
          : new Date().toISOString().slice(0, 10);
        const dayStart = new Date(`${dayStr}T00:00:00.000Z`);
        const dayEnd = new Date(`${dayStr}T23:59:59.999Z`);

        if (status === 'current') {
          whereClause.status = { notIn: NON_LIVE };
          whereClause.startDate = { lte: dayEnd };
          whereClause.endDate = { gte: dayStart };
        } else if (status === 'upcoming') {
          whereClause.status = { notIn: NON_LIVE };
          whereClause.startDate = { gt: dayEnd };
        } else if (status === 'departed') {
          whereClause.status = { notIn: NON_LIVE };
          whereClause.endDate = { lt: dayStart };
        } else if (['early', 'cancelled', 'pending'].includes(status)) {
          whereClause.status = { early: 'checked_out_early', cancelled: 'cancelled', pending: 'pending' }[status];
        }
      }

      const paymentsInclude = {
        payments: { orderBy: { date: 'desc' }, select: { id: true, amount: true } }
      };

      // Payment-status needs per-booking totals, which can't be expressed in a
      // single Prisma where-clause — compute in memory, then paginate.
      const payBucket = (b) => {
        const s = new Date(b.startDate);
        const e = new Date(b.endDate);
        const nights = Math.ceil(Math.abs(e - s) / 86400000) || 1;
        const due = b.totalPrice != null ? Number(b.totalPrice) : Number(b.pricePerNight) * nights;
        const received = (b.payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
        if (received === 0) return 'due';
        if (received >= due - 0.01) return 'paid';
        return 'partial';
      };

      if (page && limit) {
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);

        let bookings;
        let totalCount;
        if (payment && payment !== 'all') {
          const all = await prisma.booking.findMany({
            where: whereClause,
            orderBy: { startDate: 'desc' },
            include: paymentsInclude
          });
          const filtered = all.filter(b => payBucket(b) === payment);
          totalCount = filtered.length;
          bookings = filtered.slice((pageNum - 1) * limitNum, (pageNum - 1) * limitNum + limitNum);
        } else {
          [bookings, totalCount] = await Promise.all([
            prisma.booking.findMany({
              where: whereClause,
              orderBy: { startDate: 'desc' },
              skip: (pageNum - 1) * limitNum,
              take: limitNum,
              include: paymentsInclude
            }),
            prisma.booking.count({ where: whereClause })
          ]);
        }

        return res.status(200).json({
          bookings,
          metadata: {
            totalCount,
            totalPages: Math.max(1, Math.ceil(totalCount / limitNum)),
            currentPage: pageNum,
            limit: limitNum
          }
        });
      } else {
        let bookings = await prisma.booking.findMany({
          where: whereClause,
          orderBy: { startDate: 'desc' },
          include: paymentsInclude
        });
        if (payment && payment !== 'all') {
          bookings = bookings.filter(b => payBucket(b) === payment);
        }
        return res.status(200).json(bookings);
      }
    }

    else if (req.method === 'POST') {
      const { apartmentId, residentName, residentId, phone, address, pricePerNight, totalPrice, pricingMode, source, startDate, endDate, notes, customerRequest, status } = req.body;

      // Validate dates
      const startStr = (startDate.split && startDate.split('T')[0]) || new Date(startDate).toISOString().split('T')[0];
      const endStr = (endDate.split && endDate.split('T')[0]) || new Date(endDate).toISOString().split('T')[0];
      const start = new Date(`${startStr}T12:00:00.000Z`);
      const end = new Date(`${endStr}T12:00:00.000Z`);
      if (end < start) {
        return res.status(400).json({ message: 'تاريخ المغادرة لا يمكن أن يكون قبل تاريخ الوصول' });
      }

      const queryStart = new Date(`${startStr}T23:59:59.999Z`);
      const queryEnd = new Date(`${endStr}T00:00:00.000Z`);

      // Verify ownership of the apartment being booked
      const apartment = await prisma.apartment.findUnique({ where: { id: apartmentId } });
      if (!apartment || apartment.userId !== targetUserId) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      // Check for overlapping bookings (ignore checked_out_early/cancelled ones
      // — they don't hold the dates)
      const overlapCount = await prisma.booking.count({
        where: {
          apartmentId,
          status: { notIn: ['checked_out_early', 'cancelled'] },
          AND: [
            { startDate: { lt: queryEnd } },
            { endDate: { gt: queryStart } }
          ]
        }
      });

      if (overlapCount > 0) {
        return res.status(400).json({ message: 'هذه الوحدة محجوزة بالفعل في الفترة المحددة' });
      }

      const booking = await prisma.booking.create({
        data: {
          userId: targetUserId,
          apartmentId,
          residentName,
          residentId: optionalText(residentId),
          phone: optionalText(phone),
          address,
          pricePerNight: parseFloat(pricePerNight),
          totalPrice: totalPrice !== undefined ? parseFloat(totalPrice) : null,
          pricingMode: pricingMode === 'total' ? 'total' : 'per_night',
          source,
          startDate: start,
          endDate: end,
          status: status || 'active',
          notes,
          customerRequest,
          creatorName: user.name || user.username
        },
        include: { payments: true }
      });

      // Edge case: If creating a historical booking (endDate < today), instantly flag unit as needing cleaning.
      // Create notification for new booking
      await notify({
        userIds: [targetUserId],
        title: 'حجز جديد',
        message: `تم تسجيل حجز جديد للنزيل ${residentName} في وحدة ${apartment.name} بواسطة ${user.name || user.username}`,
        type: 'booking',
        link: 'residents',
        tag: `booking-new:${booking.id}`
      });

      if (user.userId !== targetUserId) {
          await notify({
            userIds: [user.userId],
            title: 'تم تأكيد الحجز',
            message: `تم تأكيد حجزك للنزيل ${residentName} في وحدة ${apartment.name}`,
            type: 'success',
            link: 'residents',
            tag: `booking-own:${booking.id}`
          });
      }

      const today = new Date(new Date().toISOString().split('T')[0] + 'T12:00:00.000Z').getTime();
      if (end.getTime() < today && !apartment.needsCleaning) {
          await prisma.apartment.update({
              where: { id: apartmentId },
              data: { needsCleaning: true }
          });
      }

      // Same-day arrival/departure reminder. The 08:00 cron may be disabled
      // or may already have run for today, so a booking that starts/ends
      // today triggers its reminder right here. The engine is idempotent
      // (day-scoped tags), so this never double-pushes.
      try {
        await runArrivalDepartureReminders({ tenantId: targetUserId });
      } catch (e) {
        console.error('Daily reminder check failed:', e);
      }

      return res.status(201).json(booking);
    }

    else if (req.method === 'PUT') {
      const { id, isCheckout, ...updateDataObj } = req.body;

      // Verify ownership of the booking
      const existing = await prisma.booking.findUnique({ where: { id } });
      if (!existing || existing.userId !== targetUserId) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      // Soft-cancel: mark the booking cancelled but KEEP the row and its
      // payments (ledger/analytics history survives). Frees the dates because
      // the overlap checks exclude 'cancelled'.
      if (updateDataObj.cancel) {
        const cancelled = await prisma.booking.update({
          where: { id },
          data: { status: 'cancelled' },
          include: { payments: true }
        });

        await notify({
          userIds: [targetUserId],
          title: 'إلغاء حجز',
          message: `تم إلغاء حجز النزيل ${existing.residentName}. سجل الدفعات محفوظ للمراجعة.`,
          type: 'warning',
          link: 'residents',
          tag: `booking-cancelled:${id}`
        });

        return res.status(200).json(cancelled);
      }

      if (isCheckout) {
        const { financialOption, customDays, reasonNotes } = updateDataObj;

        // Handle Early Checkout
        const newEndDate = new Date();

        let newTotalPrice = existing.totalPrice || (Number(existing.pricePerNight) * Math.ceil(Math.abs(new Date(existing.endDate) - new Date(existing.startDate)) / (1000 * 60 * 60 * 24)));

        if (financialOption === 'recalculate' && customDays !== undefined) {
           newTotalPrice = Number(customDays) * Number(existing.pricePerNight);
        }

        let updatedNotes = existing.notes || '';
        if (reasonNotes && reasonNotes.trim() !== '') {
            updatedNotes += (updatedNotes ? '\n\n' : '') + '--- سبب المغادرة المبكرة ---\n' + reasonNotes;
        }

        const apartment = await prisma.apartment.findUnique({ where: { id: existing.apartmentId } });

        // Notify the Admin (apartment owner)
        await notify({
          userIds: [targetUserId],
          title: 'مغادرة مبكرة',
          message: `الموظف ${user.name || user.username} قام بتسجيل خروج مبكر للنزيل ${existing.residentName} من وحدة ${apartment.name}. السبب: ${reasonNotes || 'غير محدد'}`,
          type: 'warning',
          link: 'residents',
          tag: `checkout-early:${existing.id}`
        });

        if (user.userId !== targetUserId) {
            await notify({
              userIds: [user.userId],
              title: 'مغادرة مبكرة',
              message: `تم تسجيل المغادرة المبكرة للنزيل ${existing.residentName} بنجاح.`,
              type: 'success',
              link: 'residents',
              tag: `checkout-early-own:${existing.id}`
            });
        }

        const booking = await prisma.booking.update({
          where: { id },
          data: {
            endDate: newEndDate,
            status: 'checked_out_early',
            totalPrice: newTotalPrice,
            notes: updatedNotes
          },
          include: { payments: true }
        });

        // If the guest already paid more than the new total (because we reduced
        // it via 'recalculate'), auto-create a refund payment for the difference
        // so the ledger stays clean. No extra step for the operator.
        //
        // Convention (matches api/payments.js): refund payments are stored with
        // a NEGATIVE amount. computeBookingTotals then just sums amounts and
        // refunds naturally subtract. We use the same convention here so the
        // auto-refund behaves identically to a manually-created one.
        if (financialOption === 'recalculate') {
          // Refunds are already stored negative, so a plain sum works.
          const paidSoFar = booking.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
          const overpaid = paidSoFar - Number(newTotalPrice);

          if (overpaid > 0.01) {
            const refund = await prisma.payment.create({
              data: {
                bookingId: id,
                userId: targetUserId,
                amount: -Math.abs(overpaid),   // NEGATIVE — see comment above
                method: 'cash',
                type: 'refund',
                notes: 'استرداد تلقائي عند المغادرة المبكرة',
                collectedBy: user.name || user.username
              }
            });
            // Return the new payment in the response so client state stays fresh
            booking.payments = [refund, ...booking.payments];
          }
        }

        // Also set unit to needs cleaning + auto-generate a cleaning task
        // (the task shows up in the new Cleaning tab, tracks who eventually
        // finishes it, and stores the checklist admin may add).
        await prisma.apartment.update({
          where: { id: existing.apartmentId },
          data: { needsCleaning: true }
        });
        try {
          await createCleaningTaskForBooking(existing, targetUserId, user);
        } catch (e) {
          // Task creation failure shouldn't fail the checkout — log and move on.
          console.error('Failed to auto-create cleaning task on checkout:', e);
        }

        const paidTotal = booking.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
        const outstanding = Number(booking.totalPrice || 0) - paidTotal;
        if (outstanding > 0.01) {
          const owner = await prisma.user.findUnique({
            where: { id: targetUserId },
            select: { largeAmountAlertThreshold: true, largeAmountAlertRatio: true }
          });
          const large = isLargeAmount(outstanding, booking.totalPrice, owner);
          await notify({
            userIds: [targetUserId],
            title: large ? 'مبلغ متبقٍ كبير بعد المغادرة' : 'مبلغ متبقٍ على الحجز',
            message: `على حجز ${existing.residentName} في وحدة ${apartment?.name || ''} مبلغ متبقٍ ${Math.round(outstanding * 100) / 100} ر.س بعد المغادرة المبكرة.`,
            type: large ? 'warning' : 'info',
            link: 'balances',
            tag: `balance-due:${id}`
          });
        }

        return res.status(200).json(booking);
      }

      const { apartmentId, residentName, residentId, phone, address, pricePerNight, totalPrice, pricingMode, source, startDate, endDate, notes, customerRequest, status } = updateDataObj;

      // Validate dates
      const startStr = (startDate.split && startDate.split('T')[0]) || new Date(startDate).toISOString().split('T')[0];
      const endStr = (endDate.split && endDate.split('T')[0]) || new Date(endDate).toISOString().split('T')[0];
      const start = new Date(`${startStr}T12:00:00.000Z`);
      const end = new Date(`${endStr}T12:00:00.000Z`);
      if (end < start) {
        return res.status(400).json({ message: 'تاريخ المغادرة لا يمكن أن يكون قبل تاريخ الوصول' });
      }

      const queryStart = new Date(`${startStr}T23:59:59.999Z`);
      const queryEnd = new Date(`${endStr}T00:00:00.000Z`);

      // If apartment changed, verify ownership of new apartment
      if (apartmentId !== existing.apartmentId) {
        const apartment = await prisma.apartment.findUnique({ where: { id: apartmentId } });
        if (!apartment || apartment.userId !== targetUserId) {
          return res.status(403).json({ message: 'Forbidden' });
        }
      }

      // Check for overlapping bookings
      const overlapCount = await prisma.booking.count({
        where: {
          apartmentId,
          id: { not: id },
          status: { notIn: ['checked_out_early', 'cancelled'] },
          AND: [
            { startDate: { lt: queryEnd } },
            { endDate: { gt: queryStart } }
          ]
        }
      });

      if (overlapCount > 0) {
        return res.status(400).json({ message: 'هذه الوحدة محجوزة بالفعل في الفترة المحددة' });
      }

      const booking = await prisma.booking.update({
        where: { id },
        data: {
          apartmentId,
          residentName,
          residentId: optionalText(residentId),
          phone: optionalText(phone),
          address,
          pricePerNight: parseFloat(pricePerNight),
          totalPrice: totalPrice !== undefined ? parseFloat(totalPrice) : null,
          pricingMode: pricingMode === 'total' ? 'total' : (existing.pricingMode || 'per_night'),
          source,
          startDate: start,
          endDate: end,
          status: status || existing.status,
          notes,
          customerRequest
        },
        include: { payments: true }
      });

      // A rescheduled booking that now starts/ends today needs today's
      // arrival/departure reminder (and a stale one may need to be dropped,
      // but the reminder engine only ever sends for the current day).
      const datesChanged =
        existing.startDate.getTime() !== start.getTime() ||
        existing.endDate.getTime() !== end.getTime();
      if (datesChanged) {
        try {
          await runArrivalDepartureReminders({ tenantId: targetUserId });
        } catch (e) {
          console.error('Daily reminder check failed:', e);
        }
      }

      return res.status(200).json(booking);
    }

    else if (req.method === 'DELETE') {
      const { id } = req.query;

      // Verify ownership
      const existing = await prisma.booking.findUnique({ where: { id } });
      if (!existing || existing.userId !== targetUserId) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      await prisma.booking.delete({
        where: { id },
      });
      return res.status(204).end();
    }

    else {
      return res.status(405).json({ message: 'Method Not Allowed' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}
