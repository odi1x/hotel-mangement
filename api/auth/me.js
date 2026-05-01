import prisma from '../../prisma.js';
import { verifyToken, cors } from '../../utils.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;

  const decoded = verifyToken(req);
  if (!decoded) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    if (req.method === 'GET') {
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId }
      });
      if (!user) return res.status(404).json({ message: 'User not found' });
      return res.status(200).json({ id: user.id, username: user.username, businessName: user.businessName, tourismLicense: user.tourismLicense });
    }

    else if (req.method === 'PUT') {
      const { businessName, tourismLicense } = req.body;
      const user = await prisma.user.update({
        where: { id: decoded.userId },
        data: { businessName, tourismLicense }
      });
      return res.status(200).json({ id: user.id, username: user.username, businessName: user.businessName, tourismLicense: user.tourismLicense });
    }

    else {
      return res.status(405).json({ message: 'Method Not Allowed' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}