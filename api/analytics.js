import prisma from '../prisma.js';
import { verifyToken, cors } from '../utils.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;

  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { apartmentId } = req.query;

  try {
    const filter = apartmentId && apartmentId !== 'all' ? { apartmentId } : {};

    // Grouping for sources using Prisma aggregations
    const sourceGroups = await prisma.booking.groupBy({
      by: ['source'],
      where: filter,
      _count: {
        id: true,
      },
    });

    const sourceCounts = {};
    sourceGroups.forEach(group => {
      sourceCounts[group.source] = group._count.id;
    });

    const countAgg = await prisma.booking.aggregate({
      where: filter,
      _count: { id: true },
    });

    // PostgreSQL specific logic for calculating total revenue and total nights
    // inside the database avoiding loading rows into memory.

    // In Neon / Postgres, diffing dates to get total days and multiplying by decimal
    // requires a raw SQL query.
    let rawQuery;
    if (apartmentId && apartmentId !== 'all') {
      rawQuery = await prisma.$queryRaw`
        SELECT
          COALESCE(SUM("pricePerNight" * GREATEST(CEIL(EXTRACT(EPOCH FROM ("endDate" - "startDate")) / 86400), 1)), 0) as "totalRevenue",
          COALESCE(SUM(GREATEST(CEIL(EXTRACT(EPOCH FROM ("endDate" - "startDate")) / 86400), 1)), 0) as "totalNights"
        FROM "Booking"
        WHERE "apartmentId" = ${apartmentId}
      `;
    } else {
       rawQuery = await prisma.$queryRaw`
        SELECT
          COALESCE(SUM("pricePerNight" * GREATEST(CEIL(EXTRACT(EPOCH FROM ("endDate" - "startDate")) / 86400), 1)), 0) as "totalRevenue",
          COALESCE(SUM(GREATEST(CEIL(EXTRACT(EPOCH FROM ("endDate" - "startDate")) / 86400), 1)), 0) as "totalNights"
        FROM "Booking"
      `;
    }

    const { totalRevenue, totalNights } = rawQuery[0];

    res.status(200).json({
      totalRevenue: Number(totalRevenue),
      totalNights: Number(totalNights),
      sourceCounts,
      count: countAgg._count.id
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}
