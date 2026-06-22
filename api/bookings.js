import prisma from '../prisma.js';
import { verifyToken, cors } from '../utils.js';
import { sendWebPush } from '../push-helper.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;

  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const targetUserId = user.adminId || user.userId;

  try {
    if (req.method === 'GET') {
      const bookings = await prisma.booking.findMany({
        where: { userId: targetUserId },
        orderBy: { startDate: 'desc' }
      });
      return res.status(200).json(bookings);
    }

    else if (req.method === 'POST') {
      const { apartmentId, residentName, residentId, phone, address, pricePerNight, totalPrice, source, startDate, endDate, notes, status } = req.body;

      // Validate dates
      const start = new Date(startDate);
      const end = new Date(endDate);
      start.setHours(0,0,0,0);
      end.setHours(0,0,0,0);
      if (end < start) {
        return res.status(400).json({ message: 'تاريخ المغادرة لا يمكن أن يكون قبل تاريخ الوصول' });
      }

      // Verify ownership of the apartment being booked
      const apartment = await prisma.apartment.findUnique({ where: { id: apartmentId } });
      if (!apartment || apartment.userId !== targetUserId) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      // Check for overlapping bookings (ignore checked_out_early ones if they don't actually overlap after their new endDate)
      const overlappingBookings = await prisma.booking.findMany({
        where: {
          apartmentId,
          status: { notIn: ['checked_out_early'] },
          AND: [
            { startDate: { lte: end } },
            { endDate: { gte: start } }
          ]
        }
      });

      if (overlappingBookings.length > 0) {
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
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          status: status || 'active',
          notes,
          creatorName: user.name || user.username
        },
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

      const today = new Date().setHours(0,0,0,0);
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
          }
        });

        // Also set unit to needs cleaning
        await prisma.apartment.update({
          where: { id: existing.apartmentId },
          data: { needsCleaning: true }
        });

        return res.status(200).json(booking);
      }

      const { apartmentId, residentName, residentId, phone, address, pricePerNight, totalPrice, source, startDate, endDate, notes, status } = updateDataObj;

      // Validate dates
      const start = new Date(startDate);
      const end = new Date(endDate);
      start.setHours(0,0,0,0);
      end.setHours(0,0,0,0);
      if (end < start) {
        return res.status(400).json({ message: 'تاريخ المغادرة لا يمكن أن يكون قبل تاريخ الوصول' });
      }

      // If apartment changed, verify ownership of new apartment
      if (apartmentId !== existing.apartmentId) {
        const apartment = await prisma.apartment.findUnique({ where: { id: apartmentId } });
        if (!apartment || apartment.userId !== targetUserId) {
          return res.status(403).json({ message: 'Forbidden' });
        }
      }

      // Check for overlapping bookings
      const overlappingBookings = await prisma.booking.findMany({
        where: {
          apartmentId,
          id: { not: id },
          status: { notIn: ['checked_out_early'] },
          AND: [
            { startDate: { lte: end } },
            { endDate: { gte: start } }
          ]
        }
      });

      if (overlappingBookings.length > 0) {
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
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          status: status || existing.status,
          notes
        },
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
