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
        orderBy: { startDate: 'desc' }
      });
      return res.status(200).json(bookings);
    }

    else if (req.method === 'POST') {
      const { apartmentId, residentName, residentId, phone, address, pricePerNight, source, startDate, endDate } = req.body;
      const booking = await prisma.booking.create({
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
      return res.status(201).json(booking);
    }

    else if (req.method === 'PUT') {
      const { id, apartmentId, residentName, residentId, phone, address, pricePerNight, source, startDate, endDate } = req.body;
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
