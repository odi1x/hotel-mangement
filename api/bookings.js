import prisma from '../prisma.js';
import { verifyToken, cors } from '../utils.js';
import { sendWebPush } from '../push-helper.js';
import { createCleaningTaskForBooking } from './admin-resources.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;

  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const targetUserId = user.adminId || user.userId;

  try {
    if (req.method === 'GET') {
      const { page, limit, search } = req.query;

      let whereClause = { userId: targetUserId };

      if (search) {
        whereClause = {
          ...whereClause,
          OR: [
            { residentName: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } }
          ]
        };
      }

      const paymentsInclude = {
        payments: { orderBy: { date: 'desc' }, select: { id: true, amount: true } }
      };

      if (page && limit) {
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);

        const [bookings, totalCount] = await Promise.all([
          prisma.booking.findMany({
            where: whereClause,
            orderBy: { startDate: 'desc' },
            skip: (pageNum - 1) * limitNum,
            take: limitNum,
            include: paymentsInclude
          }),
          prisma.booking.count({ where: whereClause })
        ]);

        return res.status(200).json({
          bookings,
          metadata: {
            totalCount,
            totalPages: Math.ceil(totalCount / limitNum),
            currentPage: pageNum,
            limit: limitNum
          }
        });
      } else {
        const bookings = await prisma.booking.findMany({
          where: whereClause,
          orderBy: { startDate: 'desc' },
          include: {
            payments: { orderBy: { date: 'desc' }, select: { id: true, amount: true } }
          }
        });
        return res.status(200).json(bookings);
      }
    }

    else if (req.method === 'POST') {
      const { apartmentId, residentName, residentId, phone, address, pricePerNight, totalPrice, source, startDate, endDate, notes, customerRequest, status } = req.body;

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

      // Check for overlapping bookings (ignore checked_out_early ones if they don't actually overlap after their new endDate)
      const overlapCount = await prisma.booking.count({
        where: {
          apartmentId,
          status: { notIn: ['checked_out_early'] },
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
          residentId,
          phone,
          address,
          pricePerNight: parseFloat(pricePerNight),
          totalPrice: totalPrice !== undefined ? parseFloat(totalPrice) : null,
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
      await prisma.notification.create({
        data: {
          userId: targetUserId, // Send to Admin
          title: 'حجز جديد',
          message: `تم تسجيل حجز جديد للنزيل ${residentName} في وحدة ${apartment.name} بواسطة ${user.name || user.username}`,
          type: 'booking'
        }
      });
      await sendWebPush(targetUserId, 'حجز جديد', `تم تسجيل حجز جديد للنزيل ${residentName} في وحدة ${apartment.name}`);

      // If a staff member created this, ALSO notify the staff member so they see the confirmation!
      if (user.userId !== targetUserId) {
          await prisma.notification.create({
            data: {
              userId: user.userId,
              title: 'تم تأكيد الحجز',
              message: `تم تأكيد حجزك للنزيل ${residentName} في وحدة ${apartment.name}`,
              type: 'success'
            }
          });
          await sendWebPush(user.userId, 'تم تأكيد الحجز', `تم تأكيد حجزك للنزيل ${residentName} في وحدة ${apartment.name}`);
      }

      const today = new Date(new Date().toISOString().split('T')[0] + 'T12:00:00.000Z').getTime();
      if (end.getTime() < today && !apartment.needsCleaning) {
          await prisma.apartment.update({
              where: { id: apartmentId },
              data: { needsCleaning: true }
          });
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
        await prisma.notification.create({
            data: {
                userId: targetUserId,
                title: 'مغادرة مبكرة',
                message: `الموظف ${user.name || user.username} قام بتسجيل خروج مبكر للنزيل ${existing.residentName} من وحدة ${apartment.name}. السبب: ${reasonNotes || 'غير محدد'}`,
                type: 'warning'
            }
        });
        await sendWebPush(targetUserId, 'مغادرة مبكرة', `الموظف ${user.name || user.username} قام بتسجيل خروج مبكر للنزيل ${existing.residentName} من وحدة ${apartment.name}. السبب: ${reasonNotes || 'غير محدد'}`);

        // Also notify the staff who performed the checkout if they are different
        if (user.userId !== targetUserId) {
            await prisma.notification.create({
                data: {
                    userId: user.userId,
                    title: 'مغادرة مبكرة',
                    message: `تم تسجيل المغادرة المبكرة للنزيل ${existing.residentName} بنجاح.`,
                    type: 'success'
                }
            });
            await sendWebPush(user.userId, 'مغادرة مبكرة', `تم تسجيل المغادرة المبكرة للنزيل ${existing.residentName} بنجاح.`);
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
          await createCleaningTaskForBooking(existing, targetUserId);
        } catch (e) {
          // Task creation failure shouldn't fail the checkout — log and move on.
          console.error('Failed to auto-create cleaning task on checkout:', e);
        }

        return res.status(200).json(booking);
      }

      const { apartmentId, residentName, residentId, phone, address, pricePerNight, totalPrice, source, startDate, endDate, notes, customerRequest, status } = updateDataObj;

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
          status: { notIn: ['checked_out_early'] },
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
          residentId,
          phone,
          address,
          pricePerNight: parseFloat(pricePerNight),
          totalPrice: totalPrice !== undefined ? parseFloat(totalPrice) : null,
          source,
          startDate: start,
          endDate: end,
          status: status || existing.status,
          notes,
          customerRequest
        },
        include: { payments: true }
      });
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
