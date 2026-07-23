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


  const { apartmentIds, startDate, endDate, action, type } = req.query;

  const targetUserId = user.adminId || user.userId;

  if (action === 'breakdown') {
    try {
      const filter = { userId: targetUserId };
      if (apartmentIds) {
          filter.apartmentId = { in: apartmentIds.split(',') };
      }
      if (startDate && endDate) {
          filter.AND = [
              { startDate: { lte: new Date(endDate) } },
              { endDate: { gte: new Date(startDate) } }
          ];
      }

      // Default period
      let periodDays = 30;
      if (startDate && endDate) {
          const s = new Date(startDate);
          const e = new Date(endDate);
          periodDays = Math.max(1, Math.ceil(Math.abs(e - s) / (1000 * 60 * 60 * 24)));
      }

      if (type === 'revenue' || type === 'occupancy' || type === 'nights') {
        const bookings = await prisma.booking.findMany({
            where: filter,
            select: {
                totalPrice: true, pricePerNight: true, startDate: true, endDate: true,
                apartment: { select: { id: true, name: true } }
            }
        });

        let totalRev = 0;
        const aptMap = {};

        bookings.forEach(b => {
          if (!b.apartment) return;
          const s = new Date(b.startDate);
          const e = new Date(b.endDate);
          const nights = Math.max(1, Math.ceil(Math.abs(e - s) / (1000 * 60 * 60 * 24)));
          const rev = b.totalPrice !== null ? Number(b.totalPrice) : (Number(b.pricePerNight) * nights);

          if (!aptMap[b.apartment.id]) {
            aptMap[b.apartment.id] = { id: b.apartment.id, name: b.apartment.name, revenue: 0, count: 0, nights: 0, availableNights: periodDays };
          }

          aptMap[b.apartment.id].revenue += rev;
          aptMap[b.apartment.id].count += 1;
          aptMap[b.apartment.id].nights += nights;
          totalRev += rev;
        });

        // Add empty apartments that passed filter
        const allApts = await prisma.apartment.findMany({
          where: apartmentIds ? { id: { in: apartmentIds.split(',') } } : { userId: targetUserId },
          select: { id: true, name: true }
        });

        allApts.forEach(a => {
           if (!aptMap[a.id]) {
               aptMap[a.id] = { id: a.id, name: a.name, revenue: 0, count: 0, nights: 0, availableNights: periodDays };
           }
        });

        let results = Object.values(aptMap).map(a => ({
           ...a,
           percentage: totalRev > 0 ? ((a.revenue / totalRev) * 100).toFixed(1) : 0,
           occupancy: ((a.nights / a.availableNights) * 100).toFixed(1)
        }));

        if (type === 'revenue') {
          results.sort((a,b) => b.revenue - a.revenue);
        } else {
          results.sort((a,b) => b.nights - a.nights);
        }

        return res.status(200).json({ data: results });
      }

      if (type === 'profit') {
         // To build a robust ledger, we need total revenue and categorized expenses
         // We can recalculate or fetch from the same logic used in the main endpoint.
         // For brevity and scalability, we will simulate the categorized ledger calculation based on the same logic.

         const bookings = await prisma.booking.findMany({
            where: filter,
            select: { totalPrice: true, pricePerNight: true, startDate: true, endDate: true, apartment: { select: { id: true, rentCost: true, rentPeriod: true, cleaningType: true, cleaningCost: true, platformFeeType: true, platformFee: true, otherExpenseAmount: true } } }
         });

         let rev = 0;
                  let platform = 0;
         let other = 0;
         let rent = 0;

         const countedRent = new Set();

         bookings.forEach(b => {
            const s = new Date(b.startDate);
            const e = new Date(b.endDate);
            const n = Math.max(1, Math.ceil(Math.abs(e - s) / (1000 * 60 * 60 * 24)));
            const r = b.totalPrice !== null ? Number(b.totalPrice) : (Number(b.pricePerNight) * n);
            rev += r;

            const apt = b.apartment;
            if (apt) {
                              if (apt.otherExpenseAmount) other += Number(apt.otherExpenseAmount);
               if (apt.platformFee) {
                   if (apt.platformFeeType === 'percentage') platform += (r * (Number(apt.platformFee) / 100));
                   else platform += Number(apt.platformFee);
               }
               if (apt.rentCost && !countedRent.has(apt.id)) {
                   let dRent = 0;
                   if (apt.rentPeriod === 'monthly') dRent = Number(apt.rentCost) / 30;
                   else if (apt.rentPeriod === 'yearly') dRent = Number(apt.rentCost) / 365;
                   rent += dRent * periodDays;
                   countedRent.add(apt.id);
               }
            }
         });

         const allApts = await prisma.apartment.findMany({
          where: apartmentIds ? { id: { in: apartmentIds.split(',') } } : { userId: targetUserId },
          select: { id: true, rentCost: true, rentPeriod: true }
         });

         allApts.forEach(apt => {
            if (apt.rentCost && !countedRent.has(apt.id)) {
                   let dRent = 0;
                   if (apt.rentPeriod === 'monthly') dRent = Number(apt.rentCost) / 30;
                   else if (apt.rentPeriod === 'yearly') dRent = Number(apt.rentCost) / 365;
                   rent += dRent * periodDays;
                   countedRent.add(apt.id);
            }
         });

         // Staff and Global
         let global = 0;
         let staffExp = 0;
         const userSettings = await prisma.user.findUnique({ where: { id: targetUserId }, select: { generalExpenses: true } });
         const staffList = await prisma.staffExpense.findMany({ where: { userId: targetUserId } });

         const ratio = (apartmentIds ? apartmentIds.split(',').length : allApts.length) / (allApts.length || 1);
         if (userSettings && userSettings.generalExpenses) {
             global += ((Number(userSettings.generalExpenses) / 30) * periodDays) * ratio;
         }

         if (staffList) {
             staffList.forEach(st => {
                 staffExp += ((Number(st.monthlySalary) / 30) * periodDays) * ratio; // simplified scope for breakdown
             });
         }

         // Maintenance costs — resolved issues with a cost value, filtered by
         // the date range (resolvedAt is when the money was actually spent) and
         // apartment scope. Show as a separate ledger line so operators can see
         // maintenance spend at a glance.
         const maintFilter = { userId: targetUserId, status: 'resolved', cost: { not: null } };
         if (apartmentIds) maintFilter.apartmentId = { in: apartmentIds.split(',') };
         if (startDate && endDate) {
             maintFilter.resolvedAt = {
                 gte: new Date(startDate),
                 lte: new Date(endDate)
             };
         }
         const maintenanceIssues = await prisma.maintenanceIssue.findMany({
             where: maintFilter,
             select: { cost: true }
         });
         const maintenance = maintenanceIssues.reduce((s, m) => s + (m.cost ? Number(m.cost) : 0), 0);

         return res.status(200).json({
             data: [
                 { category: 'إجمالي الإيرادات', amount: rev, type: 'income' },
                 { category: 'تكاليف الإيجار', amount: rent, type: 'expense' },
                 { category: 'رسوم المنصات', amount: platform, type: 'expense' },
                 { category: 'رواتب الموظفين', amount: staffExp, type: 'expense' },
                 { category: 'تكاليف الصيانة', amount: maintenance, type: 'expense' },
                 { category: 'مصروفات عامة وأخرى', amount: global + other, type: 'expense' },
             ]
         });
      }

      return res.status(400).json({ message: 'Invalid breakdown type' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Error fetching breakdown' });
    }
  }


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
        select: { generalExpenses: true }
    });

        // Fetch StaffExpenses — kept for pre-migration users. Once expenses
    // are migrated, we read from the Expense table instead.
    const staffExpenses = await prisma.staffExpense.findMany({
        where: { userId: targetUserId }
    });

    // Detect if this user has migrated to the Expense table. If any Expense
    // row exists with sourceType='migration' or 'maintenance', the migration
    // has run and we should treat the Expense table as source of truth.
    const migratedCount = await prisma.expense.count({
        where: { userId: targetUserId, sourceType: { in: ['migration', 'maintenance', 'manual'] } }
    });
    const useExpenseTable = migratedCount > 0;

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
    const aptStats = {};

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

        if (booking.apartment) {
            const aptId = booking.apartment.id;
            if (!aptStats[aptId]) {
                aptStats[aptId] = { id: aptId, name: booking.apartment.name, revenue: 0, nights: 0 };
            }
            aptStats[aptId].revenue += revenue;
            aptStats[aptId].nights += nights;
        }

        const dateStr = new Date(booking.startDate).toLocaleDateString('en-CA', { month: 'short', year: 'numeric' });
        if (!dailyTrendMap[dateStr]) {
            dailyTrendMap[dateStr] = { name: dateStr, revenue: 0, expenses: 0 };
        }
        dailyTrendMap[dateStr].revenue += revenue;

        let bookingExpenses = 0;

        // Calculate variable costs per booking
        const apt = booking.apartment;
        if (apt) {
            if (apt.cleaningType === 'per_booking' && apt.cleaningCost) bookingExpenses += Number(apt.cleaningCost);
            if (apt.otherExpenseAmount) bookingExpenses += Number(apt.otherExpenseAmount);

            if (apt.platformFee) {
                if (apt.platformFeeType === 'percentage') {
                    bookingExpenses += (revenue * (Number(apt.platformFee) / 100));
                } else {
                    bookingExpenses += Number(apt.platformFee);
                }
            }

            // Apportion fixed rent cost if not already added for this unit in this filter period.
            // SKIP after migration — rent lives as Expense records post-migration.
            if (!useExpenseTable && apt.rentCost && !countedRentApartmentIds.has(apt.id)) {
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
    // SKIP after migration — rent lives as Expense records.
    if (!useExpenseTable) {
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
    } // /if (!useExpenseTable) — empty-apartment rent block

    // Add global operational expenses (cleaner salary and general expenses) based on the timeframe
    // Assuming cleaner salary is monthly and general expenses are monthly
    let apportionedGlobalExpenses = 0;
    if (userSettings) {
        // Calculate the ratio of selected apartments vs total apartments owned by user
        // This ensures if someone filters 1 apartment out of 10, they only see 1/10th of the global overhead.
        const totalAptCount = allApartments.length > 0 ? allApartments.length : 1;
        const ratio = filteredAptCount / totalAptCount;

        // Dynamic Staff Payroll Apportioning — SKIP when migrated to Expense
        // table. Post-migration, staff salaries live as Expense records
        // (category=staff, isRecurring=true) and are summed via the block
        // below (the Expense-table read). Reading both would double-count.
        if (!useExpenseTable && staffExpenses && staffExpenses.length > 0) {
            staffExpenses.forEach(staff => {
                const scopeArr = staff.scope && staff.scope !== 'all' ? staff.scope.split(',') : [];
                let ratioToUse = ratio; // Default applies to all (meaning we scale it by the general filter ratio)

                if (scopeArr.length > 0) {
                    let scopedAptCount = scopeArr.length;
                    let activeScopedUnits = scopeArr.length;

                    if (apartmentIds) {
                        const filteredArr = apartmentIds.split(',');
                        activeScopedUnits = filteredArr.filter(id => scopeArr.includes(id)).length;
                    }

                    ratioToUse = scopedAptCount > 0 ? (activeScopedUnits / scopedAptCount) : 0;
                }

                apportionedGlobalExpenses += ((Number(staff.monthlySalary) / 30) * periodDays) * ratioToUse;
            });
        }
        if (userSettings.generalExpenses) {
             apportionedGlobalExpenses += ((Number(userSettings.generalExpenses) / 30) * periodDays) * ratio;
        }
    }

    totalExpenses += apportionedGlobalExpenses;

    // Maintenance costs — pre-migration path. Once migrated, maintenance
    // costs live as Expense records (sourceType='maintenance') and are
    // summed in the Expense-table block below.
    if (!useExpenseTable) {
        const maintFilterMain = { userId: targetUserId, status: 'resolved', cost: { not: null } };
        if (apartmentIds) maintFilterMain.apartmentId = { in: apartmentIds.split(',') };
        if (startDate && endDate) {
            maintFilterMain.resolvedAt = {
                gte: new Date(startDate),
                lte: new Date(endDate)
            };
        }
        const maintenanceItems = await prisma.maintenanceIssue.findMany({
            where: maintFilterMain,
            select: { cost: true, resolvedAt: true }
        });
        let totalMaintenance = 0;
        maintenanceItems.forEach(m => {
            const c = m.cost ? Number(m.cost) : 0;
            if (c <= 0) return;
            totalMaintenance += c;
            // Also land it in the correct month bucket for the trend chart
            if (m.resolvedAt) {
                const key = `${m.resolvedAt.getFullYear()}-${String(m.resolvedAt.getMonth() + 1).padStart(2, '0')}`;
                if (dailyTrendMap[key]) dailyTrendMap[key].expenses += c;
            }
        });
        totalExpenses += totalMaintenance;
    }

    // Post-migration expense read: the Expense table is the source of truth.
    // We split into two buckets:
    //   - One-time (non-recurring) expenses dated within the period → summed straight
    //   - Recurring (monthly / yearly) expenses → prorated over the period days
    // For scope=unit expenses, we only count if that unit is in the current filter.
    // For scope=global, we apply the same filter ratio as other overhead.
    if (useExpenseTable) {
        const allExpenses = await prisma.expense.findMany({
            where: { userId: targetUserId }
        });
        const totalAptCount = allApartments.length > 0 ? allApartments.length : 1;
        const globalRatio = filteredAptCount / totalAptCount;
        const filteredAptSet = apartmentIds ? new Set(apartmentIds.split(',')) : null;
        const rangeStart = startDate ? new Date(startDate) : null;
        const rangeEnd = endDate ? new Date(endDate) : null;

        let expenseTableTotal = 0;
        for (const e of allExpenses) {
            const amount = Number(e.amount || 0);
            if (amount <= 0) continue;

            // Apply scope filtering
            let scopeRatio = 1;
            if (e.scope === 'unit') {
                if (!e.apartmentId) continue;
                if (filteredAptSet && !filteredAptSet.has(e.apartmentId)) continue;
                scopeRatio = 1; // full amount, this unit is in scope
            } else {
                scopeRatio = globalRatio; // global — apportion by filter ratio
            }

            // Apply time range
            if (e.isRecurring) {
                // Recurring: prorate over the period
                let dailyAmount = 0;
                if (e.recurringPeriod === 'yearly')  dailyAmount = amount / 365;
                else                                 dailyAmount = amount / 30; // monthly default
                expenseTableTotal += dailyAmount * periodDays * scopeRatio;
                // Distribute into trend map
                const trendKeys = Object.keys(dailyTrendMap);
                if (trendKeys.length > 0) {
                    const perMonth = (dailyAmount * periodDays * scopeRatio) / trendKeys.length;
                    trendKeys.forEach(k => { dailyTrendMap[k].expenses += perMonth; });
                }
            } else {
                // One-time: include if within range
                const eDate = new Date(e.date);
                if (rangeStart && eDate < rangeStart) continue;
                if (rangeEnd && eDate > rangeEnd) continue;
                expenseTableTotal += amount * scopeRatio;
                // Land in the correct month bucket
                const key = `${eDate.getFullYear()}-${String(eDate.getMonth() + 1).padStart(2, '0')}`;
                if (dailyTrendMap[key]) dailyTrendMap[key].expenses += amount * scopeRatio;
            }
        }
        totalExpenses += expenseTableTotal;
    }

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

    const topUnits = Object.values(aptStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 3);

    res.status(200).json({
      totalRevenue,
      totalExpenses,
      netProfit,
      totalNights,
      occupancyRate,
      sourceCounts,
      count: bookings.length,
      dailyTrend,
      topUnits
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}
