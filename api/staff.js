import bcrypt from 'bcrypt';
import prisma from '../prisma.js';
import { verifyToken, cors } from '../utils.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;

  const decoded = verifyToken(req);
  if (!decoded) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Only admins can access staff endpoints
  if (decoded.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: Only admins can manage staff' });
  }

  try {
    if (req.method === 'GET') {
      const staff = await prisma.user.findMany({
        where: { adminId: decoded.userId },
        select: {
          id: true,
          username: true,
          name: true,
          profilePicture: true,
          createdAt: true,
          canBook: true,
          canEdit: true,
          canDelete: true,
          canViewAnalytics: true,
          canViewSettings: true
        },
        orderBy: { createdAt: 'desc' }
      });
      return res.status(200).json(staff);
    }

    else if (req.method === 'POST') {
      const { username, password, name, profilePicture, canBook, canEdit, canDelete, canViewAnalytics, canViewSettings } = req.body;

      if (!username || !password || !name) {
        return res.status(400).json({ message: 'Username, password, and name are required' });
      }

      const existingUser = await prisma.user.findUnique({
        where: { username }
      });

      if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const staffMember = await prisma.user.create({
        data: {
          username,
          password: hashedPassword,
          name,
          profilePicture,
          role: 'staff',
          adminId: decoded.userId,
          canBook,
          canEdit,
          canDelete,
          canViewAnalytics,
          canViewSettings
        }
      });

      return res.status(201).json({ message: 'Staff created successfully', id: staffMember.id });
    }

    else {
      return res.status(405).json({ message: 'Method Not Allowed' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}