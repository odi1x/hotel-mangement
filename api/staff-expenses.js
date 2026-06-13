import { PrismaClient } from '@prisma/client';
import { getUserIdFromToken, sendError, cors } from '../utils.js';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (cors(req, res)) return;

  const userId = getUserIdFromToken(req);
  if (!userId) {
    return sendError(res, 'Unauthorized', 401);
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
        return sendError(res, 'Name and Monthly Salary are required', 400);
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
        return sendError(res, 'Expense ID is required', 400);
      }

      await prisma.staffExpense.delete({
        where: { id, userId }
      });

      return res.status(200).json({ message: 'Expense deleted successfully' });
    }

    return sendError(res, 'Method not allowed', 405);
  } catch (error) {
    console.error('Staff Expense API Error:', error);
    return sendError(res, 'Internal server error', 500);
  }
}
