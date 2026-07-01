import prisma from '../../prisma.js';
import { cors } from '../../utils.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;

  const { adminId, startDate, endDate } = req.query;

  if (!adminId) {
    return res.status(400).json({ message: 'Admin ID is required' });
  }

  try {
    if (req.method === 'GET') {
      // Find all apartments owned by the admin
      const apartments = await prisma.apartment.findMany({
        where: { userId: adminId },
      });

      // Filter by availability if dates are provided
      if (startDate && endDate) {
        const parsedStart = new Date(startDate);
        const parsedEnd = new Date(endDate);

        // Find bookings that overlap with requested dates
        const conflictingBookings = await prisma.booking.findMany({
          where: {
            apartmentId: { in: apartments.map(a => a.id) },
            status: 'active',
            OR: [
              {
                startDate: { lt: parsedEnd },
                endDate: { gt: parsedStart }
              }
            ]
          },
          select: { apartmentId: true }
        });

        const conflictingApartmentIds = new Set(conflictingBookings.map(b => b.apartmentId));
        const availableApartments = apartments.filter(a => !conflictingApartmentIds.has(a.id));

        return res.status(200).json(availableApartments);
      }

      // If no dates, just return all
      return res.status(200).json(apartments);
    } else {
      return res.status(405).json({ message: 'Method Not Allowed' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}
