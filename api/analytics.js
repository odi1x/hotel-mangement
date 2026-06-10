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

  const { apartmentIds, startDate, endDate } = req.query;

  const targetUserId = user.adminId || user.userId;

  try {
    const filter = { userId: targetUserId };

    if (apartmentIds) {
        filter.apartmentId = { in: apartmentIds.split(',') };
    }

    if (startDate && endDate) {
        // Find bookings that overlap with the selected date range
        filter.AND = [
            { startDate: { lte: new Date(endDate) } },
            { endDate: { gte: new Date(startDate) } }
        ];
    }

    // Since SQLite/JS handles dates differently and we need to handle overlapping logic safely
    // with potentially complex filters, fetching the relevant bookings and aggregating in JS
    // is safer and more universally compatible than raw SQL, especially given typical small datasets per user.
    const bookings = await prisma.booking.findMany({
        where: filter,
        select: {
            id: true,
            source: true,
            pricePerNight: true,
            totalPrice: true,
            startDate: true,
            endDate: true,
            apartment: {
                select: {
                    id: true,
                    rentCost: true,
                    rentPeriod: true,
                    cleaningCost: true,
                    platformFeeType: true,
                    platformFee: true,
                    otherExpenseAmount: true
                }
            }
        }
    });

    // Also get all apartments for the occupancy rate denominator
    const allApartments = await prisma.apartment.findMany({
        where: { userId: targetUserId },
        select: { id: true }
    });

    // Get user global settings for staff and general expenses
    const userSettings = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { cleanerSalary: true, generalExpenses: true }
    });

    // Default period for occupancy calculation if no dates provided (assume 30 days)
    let periodDays = 30;
    if (startDate && endDate) {
        const s = new Date(startDate);
        const e = new Date(endDate);
        periodDays = Math.max(1, Math.ceil(Math.abs(e - s) / (1000 * 60 * 60 * 24)));
    }

    // We calculate available days: if apartments are filtered, only count them
    const filteredAptCount = apartmentIds ? apartmentIds.split(',').length : allApartments.length;
    const totalAvailableNights = filteredAptCount * periodDays;

    let totalRevenue = 0;
    let totalNights = 0;
    let totalExpenses = 0;
    const sourceCounts = {};
    const dailyTrendMap = {}; // { 'YYYY-MM': { name: 'YYYY-MM', revenue: 0, expenses: 0 } }

    // Keep track of which apartments we've already counted rent for in this period to avoid over-counting rent
    const countedRentApartmentIds = new Set();

    bookings.forEach(booking => {
        const s = new Date(booking.startDate);
        const e = new Date(booking.endDate);
        const diffTime = Math.abs(e - s);
        const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

        totalNights += nights;

        // Calculate revenue
        const revenue = booking.totalPrice !== null ? Number(booking.totalPrice) : (Number(booking.pricePerNight) * nights);
        totalRevenue += revenue;

        const dateStr = new Date(booking.startDate).toLocaleDateString('en-CA', { month: 'short', year: 'numeric' });
        if (!dailyTrendMap[dateStr]) {
            dailyTrendMap[dateStr] = { name: dateStr, revenue: 0, expenses: 0 };
        }
        dailyTrendMap[dateStr].revenue += revenue;

        let bookingExpenses = 0;

        // Calculate variable costs per booking
        const apt = booking.apartment;
        if (apt) {
            if (apt.cleaningCost) bookingExpenses += Number(apt.cleaningCost);
            if (apt.otherExpenseAmount) bookingExpenses += Number(apt.otherExpenseAmount);

            if (apt.platformFee) {
                if (apt.platformFeeType === 'percentage') {
                    bookingExpenses += (revenue * (Number(apt.platformFee) / 100));
                } else {
                    bookingExpenses += Number(apt.platformFee);
                }
            }

            // Apportion fixed rent cost if not already added for this unit in this filter period
            if (apt.rentCost && !countedRentApartmentIds.has(apt.id)) {
                let dailyRent = 0;
                if (apt.rentPeriod === 'monthly') dailyRent = Number(apt.rentCost) / 30;
                else if (apt.rentPeriod === 'yearly') dailyRent = Number(apt.rentCost) / 365;

                const apportionedRent = dailyRent * periodDays;
                totalExpenses += apportionedRent;

                // For trend chart, distribute rent across months roughly (this is simplified to add to the booking's month)
                dailyTrendMap[dateStr].expenses += apportionedRent;

                countedRentApartmentIds.add(apt.id);
            }
        }

        totalExpenses += bookingExpenses;
        dailyTrendMap[dateStr].expenses += bookingExpenses;

        sourceCounts[booking.source] = (sourceCounts[booking.source] || 0) + 1;
    });

    // Apportion rent for empty apartments that passed the filter but had no bookings!
    if (apartmentIds) {
        const apts = await prisma.apartment.findMany({
            where: { id: { in: apartmentIds.split(',') } }
        });
        apts.forEach(apt => {
            if (apt.rentCost && !countedRentApartmentIds.has(apt.id)) {
                let dailyRent = 0;
                if (apt.rentPeriod === 'monthly') dailyRent = Number(apt.rentCost) / 30;
                else if (apt.rentPeriod === 'yearly') dailyRent = Number(apt.rentCost) / 365;
                totalExpenses += dailyRent * periodDays;
                countedRentApartmentIds.add(apt.id);
            }
        });
    } else {
        // Using Promise.all with map is better, but since it's just id lookups we can fetch them all
        const uncountedApts = await prisma.apartment.findMany({
            where: { id: { in: allApartments.map(a => a.id).filter(id => !countedRentApartmentIds.has(id)) } }
        });
        uncountedApts.forEach(apt => {
            if (apt.rentCost) {
                let dailyRent = 0;
                if (apt.rentPeriod === 'monthly') dailyRent = Number(apt.rentCost) / 30;
                else if (apt.rentPeriod === 'yearly') dailyRent = Number(apt.rentCost) / 365;
                totalExpenses += dailyRent * periodDays;
                countedRentApartmentIds.add(apt.id);
            }
        });
    }

    // Add global operational expenses (cleaner salary and general expenses) based on the timeframe
    // Assuming cleaner salary is monthly and general expenses are monthly
    let apportionedGlobalExpenses = 0;
    if (userSettings) {
        if (userSettings.cleanerSalary) {
             apportionedGlobalExpenses += (Number(userSettings.cleanerSalary) / 30) * periodDays;
        }
        if (userSettings.generalExpenses) {
             apportionedGlobalExpenses += (Number(userSettings.generalExpenses) / 30) * periodDays;
        }
    }

    totalExpenses += apportionedGlobalExpenses;

    // Distribute the global expenses roughly into the trend map if it has items, otherwise we just leave it out of trend
    const trendKeys = Object.keys(dailyTrendMap);
    if (trendKeys.length > 0 && apportionedGlobalExpenses > 0) {
        const perMonthExpense = apportionedGlobalExpenses / trendKeys.length;
        trendKeys.forEach(k => {
            dailyTrendMap[k].expenses += perMonthExpense;
        });
    }

    const netProfit = totalRevenue - totalExpenses;
    const occupancyRate = totalAvailableNights > 0 ? (totalNights / totalAvailableNights) * 100 : 0;

    const dailyTrend = Object.values(dailyTrendMap).sort((a, b) => new Date(a.name) - new Date(b.name));

    res.status(200).json({
      totalRevenue,
      totalExpenses,
      netProfit,
      totalNights,
      occupancyRate,
      sourceCounts,
      count: bookings.length,
      dailyTrend
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}
