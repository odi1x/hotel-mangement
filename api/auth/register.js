import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../../prisma.js';
import { cors } from '../../utils.js';

const JWT_SECRET = process.env.JWT_SECRET;

export default async function handler(req, res) {
  if (cors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { username, password, name, profilePicture } = req.body;

    if (!username || !password || !name) {
      return res.status(400).json({ message: 'Username, password, and name are required' });
    }

    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        name,
        profilePicture,
        role: 'admin',
      },
    });

    const token = jwt.sign({
      userId: user.id,
      username: user.username,
      role: user.role,
      adminId: user.adminId
    }, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        profilePicture: user.profilePicture,
        role: user.role,
        adminId: user.adminId,
        businessName: user.businessName,
        tourismLicense: user.tourismLicense,
        permissions: {
          canBook: user.canBook,
          canEdit: user.canEdit,
          canDelete: user.canDelete,
          canViewAnalytics: user.canViewAnalytics,
          canViewSettings: user.canViewSettings
        }
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}
