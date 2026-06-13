import { PrismaClient } from '@prisma/client';
import { verifyToken, cors } from '../utils.js';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (cors(req, res)) return;

  const decoded = verifyToken(req);
  if (!decoded) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const userId = decoded.userId || decoded.id;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    if (req.method === 'GET') {
      const expenses = await prisma.staffExpense.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });
      return res.status(200).json(expenses);
    }

    if (req.method === 'POST') {
      const { name, monthlySalary, scope } = req.body;

      if (!name || !monthlySalary) {
        return res.status(400).json({ message: 'Name and Monthly Salary are required' });
      }

      const expense = await prisma.staffExpense.create({
        data: {
          name,
          monthlySalary: parseFloat(monthlySalary),
          scope: scope || 'all',
          userId
        }
      });

      return res.status(201).json(expense);
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ message: 'Expense ID is required' });
      }

      await prisma.staffExpense.delete({
        where: { id, userId }
      });

      return res.status(200).json({ message: 'Expense deleted successfully' });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Staff Expense API Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
