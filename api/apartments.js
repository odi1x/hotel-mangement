import prisma from '../prisma.js';
import { verifyToken, cors } from '../utils.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;

  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // If user is staff, target the admin's account ID for data ownership
  const targetUserId = user.adminId || user.userId;

  try {
    if (req.method === 'GET') {
      const apartments = await prisma.apartment.findMany({
        where: { userId: targetUserId },
        orderBy: { createdAt: 'desc' }
      });
      return res.status(200).json(apartments);
    }

    else if (req.method === 'POST') {
      const {
        name, type, description, basePrice,
        rentCost, rentPeriod, cleaningType, cleaningCost,
        platformFeeType, platformFee,
        otherExpenseLabel, otherExpenseAmount,
        licenseId
      } = req.body;
      const apartment = await prisma.apartment.create({
        data: {
          userId: targetUserId,
          name,
          type,
          description,
          basePrice: parseFloat(basePrice) || 0,
          rentCost: rentCost ? parseFloat(rentCost) : null,
          rentPeriod,
          cleaningType: cleaningType || 'salaried',
          cleaningCost: cleaningType === 'per_booking' && cleaningCost ? parseFloat(cleaningCost) : null,
          platformFeeType,
          platformFee: platformFee ? parseFloat(platformFee) : null,
          images: req.body.images || [],
          coverPhoto: req.body.coverPhoto || null,
          otherExpenseLabel,
          otherExpenseAmount: otherExpenseAmount ? parseFloat(otherExpenseAmount) : null,
          licenseId: licenseId || null,
        },
      });
      return res.status(201).json(apartment);
    }

    else if (req.method === 'PUT') {
      const {
        id, name, type, description, basePrice, needsCleaning,
        rentCost, rentPeriod, cleaningType, cleaningCost,
        platformFeeType, platformFee,
        otherExpenseLabel, otherExpenseAmount,
        licenseId
      } = req.body;

      // Verify ownership
      const existing = await prisma.apartment.findUnique({ where: { id } });
      if (!existing || existing.userId !== targetUserId) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      const updateData = {
          name,
          type,
          description,
          basePrice: parseFloat(basePrice) || 0,
          rentCost: rentCost ? parseFloat(rentCost) : null,
          rentPeriod,
          cleaningType: cleaningType || 'salaried',
          cleaningCost: cleaningType === 'per_booking' && cleaningCost ? parseFloat(cleaningCost) : null,
          platformFeeType,
          platformFee: platformFee ? parseFloat(platformFee) : null,
          images: req.body.images || [],
          coverPhoto: req.body.coverPhoto || null,
          otherExpenseLabel,
          otherExpenseAmount: otherExpenseAmount ? parseFloat(otherExpenseAmount) : null,
          licenseId: licenseId || null,
      };

      if (needsCleaning !== undefined) {
          updateData.needsCleaning = needsCleaning;
          if (needsCleaning === false) {
              updateData.lastCleanedAt = new Date();
          }
      }

      const apartment = await prisma.apartment.update({
        where: { id },
        data: updateData,
      });
      return res.status(200).json(apartment);
    }

    else if (req.method === 'DELETE') {
      const { id } = req.query;

      // Verify ownership
      const existing = await prisma.apartment.findUnique({ where: { id } });
      if (!existing || existing.userId !== targetUserId) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      await prisma.apartment.delete({
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
