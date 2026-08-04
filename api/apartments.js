import prisma from '../prisma.js';
import { verifyToken, cors } from '../utils.js';

/**
 * /api/apartments
 *
 * GET    → list apartments for this user
 * POST   → create a new apartment
 * PUT    → update an existing apartment (by id in body)
 * DELETE → delete apartment by ?id=…
 *
 * Post-Phase-2b schema. Only these fields exist on Apartment:
 *   - basePrice
 *   - cleaningFeePerStay
 *   - platformFeeType, platformFee
 *   - name, type, description, images, coverPhoto, licenseId
 *   - needsCleaning, lastCleanedAt
 *
 * Dropped in 2b: rentCost, rentPeriod, cleaningType, cleaningCost,
 * otherExpenseLabel, otherExpenseAmount. Any client still sending those
 * fields — they're ignored silently rather than throwing.
 */
export default async function handler(req, res) {
  if (cors(req, res)) return;

  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

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
        cleaningFeePerStay,
        platformFeeType, platformFee,
        licenseId, images, coverPhoto
      } = req.body;
      const apartment = await prisma.apartment.create({
        data: {
          userId: targetUserId,
          name,
          type,
          description,
          basePrice: parseFloat(basePrice) || 0,
          cleaningFeePerStay: cleaningFeePerStay ? parseFloat(cleaningFeePerStay) : null,
          platformFeeType,
          platformFee: platformFee ? parseFloat(platformFee) : null,
          licenseId: licenseId || null,
          images: images || [],
          coverPhoto: coverPhoto || null,
        },
      });
      return res.status(201).json(apartment);
    }

    else if (req.method === 'PUT') {
      const {
        id, name, type, description, basePrice, needsCleaning,
        cleaningFeePerStay,
        platformFeeType, platformFee,
        licenseId, images, coverPhoto
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
        cleaningFeePerStay: cleaningFeePerStay ? parseFloat(cleaningFeePerStay) : null,
        platformFeeType,
        platformFee: platformFee ? parseFloat(platformFee) : null,
        licenseId: licenseId || null,
        images: images !== undefined ? images : existing.images,
        coverPhoto: coverPhoto !== undefined ? coverPhoto : existing.coverPhoto,
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
