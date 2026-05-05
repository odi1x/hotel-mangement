import prisma from '../prisma.js';
import { verifyToken, cors } from '../utils.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;

  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    if (req.method === 'GET') {
      const bookings = await prisma.booking.findMany({
        where: { userId: user.userId },
        orderBy: { startDate: 'desc' }
      });
      return res.status(200).json(bookings);
    }

    else if (req.method === 'POST') {
      const { apartmentId, residentName, residentId, phone, address, pricePerNight, source, startDate, endDate } = req.body;

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
      if (!apartment || apartment.userId !== user.userId) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      // Check for overlapping bookings
      const overlappingBookings = await prisma.booking.findMany({
        where: {
          apartmentId,
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
          userId: user.userId,
          apartmentId,
          residentName,
          residentId,
          phone,
          address,
          pricePerNight: parseFloat(pricePerNight),
          source,
          startDate: new Date(startDate),
          endDate: new Date(endDate)
        },
      });
      return res.status(201).json(booking);
    }

    else if (req.method === 'PUT') {
      const { id, apartmentId, residentName, residentId, phone, address, pricePerNight, source, startDate, endDate } = req.body;

      // Validate dates
      const start = new Date(startDate);
      const end = new Date(endDate);
      start.setHours(0,0,0,0);
      end.setHours(0,0,0,0);
      if (end < start) {
        return res.status(400).json({ message: 'تاريخ المغادرة لا يمكن أن يكون قبل تاريخ الوصول' });
      }

      // Verify ownership of the booking
      const existing = await prisma.booking.findUnique({ where: { id } });
      if (!existing || existing.userId !== user.userId) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      // If apartment changed, verify ownership of new apartment
      if (apartmentId !== existing.apartmentId) {
        const apartment = await prisma.apartment.findUnique({ where: { id: apartmentId } });
        if (!apartment || apartment.userId !== user.userId) {
          return res.status(403).json({ message: 'Forbidden' });
        }
      }

      // Check for overlapping bookings
      const overlappingBookings = await prisma.booking.findMany({
        where: {
          apartmentId,
          id: { not: id },
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
          source,
          startDate: new Date(startDate),
          endDate: new Date(endDate)
        },
      });
      return res.status(200).json(booking);
    }

    else if (req.method === 'DELETE') {
      const { id } = req.query;

      // Verify ownership
      const existing = await prisma.booking.findUnique({ where: { id } });
      if (!existing || existing.userId !== user.userId) {
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
