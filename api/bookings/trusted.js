import prisma from '../../prisma.js';
import { verifyToken } from '../../utils.js';

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const user = verifyToken(req);
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { phone, trusted } = req.body;

    if (!phone) {
      return res.status(400).json({ message: 'Phone is required' });
    }

    // Update all bookings for this user's apartments that have this phone number
    await prisma.booking.updateMany({
      where: {
        userId: user.id,
        phone: phone,
      },
      data: {
        trusted: trusted,
      },
    });

    res.status(200).json({ message: 'Status updated successfully' });
  } catch (error) {
    console.error('Error updating trusted status:', error);
    res.status(500).json({ message: 'Server error' });
  }
}
