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
      const apartments = await prisma.apartment.findMany({
        orderBy: { createdAt: 'desc' }
      });
      return res.status(200).json(apartments);
    }

    else if (req.method === 'POST') {
      const { name, type, description, basePrice } = req.body;
      const apartment = await prisma.apartment.create({
        data: {
          name,
          type,
          description,
          basePrice: parseFloat(basePrice) || 0,
        },
      });
      return res.status(201).json(apartment);
    }

    else if (req.method === 'PUT') {
      const { id, name, type, description, basePrice } = req.body;
      const apartment = await prisma.apartment.update({
        where: { id },
        data: {
          name,
          type,
          description,
          basePrice: parseFloat(basePrice) || 0,
        },
      });
      return res.status(200).json(apartment);
    }

    else if (req.method === 'DELETE') {
      const { id } = req.query;
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
