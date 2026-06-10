import prisma from '../prisma.js';
import { verifyToken, cors } from '../utils.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;

  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const targetUserId = user.adminId || user.userId;

  try {
    if (req.method === 'GET') {
      const licenses = await prisma.license.findMany({
        where: { userId: targetUserId },
        orderBy: { createdAt: 'desc' }
      });
      return res.status(200).json(licenses);
    }

    else if (req.method === 'POST') {
      // Only admins can create licenses
      if (user.role !== 'admin') {
          return res.status(403).json({ message: 'Forbidden' });
      }

      const { licenseNumber } = req.body;
      if (!licenseNumber) {
          return res.status(400).json({ message: 'License number is required' });
      }

      const license = await prisma.license.create({
        data: {
          userId: targetUserId,
          licenseNumber
        },
      });
      return res.status(201).json(license);
    }

    else if (req.method === 'DELETE') {
      // Only admins can delete licenses
      if (user.role !== 'admin') {
          return res.status(403).json({ message: 'Forbidden' });
      }

      const { id } = req.query;

      // Verify ownership
      const existing = await prisma.license.findUnique({ where: { id } });
      if (!existing || existing.userId !== targetUserId) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      await prisma.license.delete({
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
