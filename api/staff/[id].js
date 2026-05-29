import bcrypt from 'bcrypt';
import prisma from '../../prisma.js';
import { verifyToken, cors } from '../../utils.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;

  const decoded = verifyToken(req);
  if (!decoded) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (decoded.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  // Extract ID from the path (e.g. /api/staff/123)
  const staffId = req.url.split('/').pop();

  if (!staffId) {
    return res.status(400).json({ message: 'Staff ID is required' });
  }

  try {
    // Verify staff belongs to admin
    const staffMember = await prisma.user.findUnique({
      where: { id: staffId }
    });

    if (!staffMember || staffMember.adminId !== decoded.userId) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    if (req.method === 'PUT') {
      const { username, password, name, profilePicture, canBook, canEdit, canDelete, canViewAnalytics, canViewSettings } = req.body;

      const updateData = {
        name,
        profilePicture,
        canBook,
        canEdit,
        canDelete,
        canViewAnalytics,
        canViewSettings
      };

      if (username && username !== staffMember.username) {
        const existing = await prisma.user.findUnique({ where: { username } });
        if (existing) return res.status(400).json({ message: 'Username already exists' });
        updateData.username = username;
      }

      if (password) {
        updateData.password = await bcrypt.hash(password, 10);
      }

      await prisma.user.update({
        where: { id: staffId },
        data: updateData
      });

      return res.status(200).json({ message: 'Staff updated successfully' });
    }

    else if (req.method === 'DELETE') {
      await prisma.user.delete({
        where: { id: staffId }
      });
      return res.status(200).json({ message: 'Staff deleted successfully' });
    }

    else {
      return res.status(405).json({ message: 'Method Not Allowed' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}