/* global process */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TARGET_USERNAME = 'admin_tester';
const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;

function randomDateBetween(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const APARTMENT_TEMPLATES = [
  { name: '1-Bedroom Studio', type: 'Studio', basePrice: 200, rentCost: 1500, cleaningCost: 100, wifiCost: 50 },
  { name: '2-Bedroom Family Suite', type: 'Suite', basePrice: 400, rentCost: 3000, cleaningCost: 150, wifiCost: 50 },
  { name: 'Luxury Penthouse', type: 'Penthouse', basePrice: 800, rentCost: 6000, cleaningCost: 300, wifiCost: 100 },
  { name: 'City View Apartment', type: 'Apartment', basePrice: 300, rentCost: 2000, cleaningCost: 120, wifiCost: 50 },
];

const GUESTS = [
  { residentName: 'Ahmed Ali', residentId: '1001001001', phone: '0501111111' },
  { residentName: 'Sarah Smith', residentId: '2002002002', phone: '0502222222' },
  { residentName: 'Mohammed Khan', residentId: '3003003003', phone: '0503333333' },
  { residentName: 'Fatima Al-Sayed', residentId: '4004004004', phone: '0504444444' },
  { residentName: 'John Doe', residentId: '5005005005', phone: '0505555555' },
];

const MAINTENANCE_CATEGORIES = ['hvac', 'plumbing', 'electrical', 'cleaning', 'furniture', 'appliances'];

async function main() {
  console.log(`Looking for user: ${TARGET_USERNAME}...`);
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { username: TARGET_USERNAME },
        { name: TARGET_USERNAME }
      ]
    },
  });

  if (!user) {
    console.error(`Error: User '${TARGET_USERNAME}' not found in the database. Please ensure the user exists before running this script.`);
    process.exit(1);
  }

  console.log(`Found user ${user.username} (ID: ${user.id}).`);

  console.log('Wiping existing data for this user...');
  await prisma.maintenanceIssue.deleteMany({ where: { userId: user.id } });
  await prisma.pricingRule.deleteMany({ where: { userId: user.id } });

  // Get apartments to delete bookings first due to FKs
  const userApartments = await prisma.apartment.findMany({ where: { userId: user.id } });
  const apartmentIds = userApartments.map(a => a.id);

  if(apartmentIds.length > 0) {
      await prisma.payment.deleteMany({
        where: {
            booking: {
                apartmentId: { in: apartmentIds }
            }
        }
      });
      await prisma.booking.deleteMany({
          where: { apartmentId: { in: apartmentIds } }
      });
  }

  await prisma.apartment.deleteMany({ where: { userId: user.id } });
  console.log('Data wiped.');

  console.log('Creating new apartments...');
  const createdApartments = [];
  // Generate 12 apartments (3 sets of 4)
  for (let i = 1; i <= 3; i++) {
    for (const template of APARTMENT_TEMPLATES) {
      const apt = await prisma.apartment.create({
        data: {
          userId: user.id,
          name: `${template.name} - Unit ${i}0${randomInt(1,9)}`,
          type: template.type,
          basePrice: template.basePrice,
          rentCost: template.rentCost,
          cleaningCost: template.cleaningCost,
          otherExpenseLabel: 'WiFi & Utilities',
          otherExpenseAmount: template.wifiCost,
        }
      });
      createdApartments.push(apt);
    }
  }

  console.log(`Created ${createdApartments.length} apartments.`);

  console.log('Creating pricing rules...');
  const now = new Date();
  const sixMonthsAgo = new Date(now.getTime() - SIX_MONTHS_MS);

  const pricingRulesData = [
    // Global weekend rule (Friday, Saturday)
    {
      userId: user.id,
      label: 'Weekend Rate',
      startDate: sixMonthsAgo,
      endDate: new Date(now.getTime() + SIX_MONTHS_MS),
      priceMode: 'multiplier',
      value: 1.2,
      priority: 50,
      daysOfWeek: [5, 6],
      color: '#3b82f6'
    },
    // Global holiday rule (Past holiday)
    {
      userId: user.id,
      label: 'Spring Holiday',
      startDate: new Date(sixMonthsAgo.getTime() + 60 * 24 * 60 * 60 * 1000), // ~2 months in
      endDate: new Date(sixMonthsAgo.getTime() + 75 * 24 * 60 * 60 * 1000),
      priceMode: 'multiplier',
      value: 1.5,
      priority: 80,
      daysOfWeek: [],
      color: '#ef4444'
    },
    // Global summer rule (Future)
    {
      userId: user.id,
      label: 'Summer Peak',
      startDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 40 * 24 * 60 * 60 * 1000),
      priceMode: 'multiplier',
      value: 1.3,
      priority: 70,
      daysOfWeek: [],
      color: '#f59e0b'
    }
  ];

  const createdRules = [];
  for (const rule of pricingRulesData) {
      const createdRule = await prisma.pricingRule.create({ data: rule });
      createdRules.push(createdRule);
  }
  console.log(`Created ${createdRules.length} pricing rules.`);

  function calculatePriceForDate(date, basePrice) {
      let finalMultiplier = 1.0;
      let highestPriority = -1;

      const dayOfWeek = date.getDay(); // 0 (Sun) - 6 (Sat)

      for (const rule of createdRules) {
          if (date >= rule.startDate && date <= rule.endDate) {
              const appliesToDay = rule.daysOfWeek.length === 0 || rule.daysOfWeek.includes(dayOfWeek);
              if (appliesToDay && rule.priority > highestPriority) {
                  highestPriority = rule.priority;
                  finalMultiplier = Number(rule.value);
              }
          }
      }
      return basePrice * finalMultiplier;
  }

  function calculateBookingPrice(startDate, endDate, basePrice) {
      let total = 0;
      let currentDate = new Date(startDate);
      // Don't count checkout day for pricing
      const end = new Date(endDate);
      while(currentDate < end) {
          total += calculatePriceForDate(currentDate, basePrice);
          currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
      }
      return total;
  }

  console.log('Generating bookings & payments...');
  for (const apt of createdApartments) {
    const numBookings = randomInt(5, 12);
    let currentStartDate = new Date(sixMonthsAgo);

    for (let i = 0; i < numBookings; i++) {
      // Add a gap between bookings
      currentStartDate = new Date(currentStartDate.getTime() + randomInt(1, 10) * 24 * 60 * 60 * 1000);

      if (currentStartDate > new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)) {
          break; // Don't go too far into the future
      }

      const stayDurationDays = randomInt(1, 7);
      const endDate = new Date(currentStartDate.getTime() + stayDurationDays * 24 * 60 * 60 * 1000);

      const guest = randomChoice(GUESTS);
      const calculatedTotalPrice = calculateBookingPrice(currentStartDate, endDate, Number(apt.basePrice));
      const avgPricePerNight = calculatedTotalPrice / stayDurationDays;

      let status = 'completed';
      if (currentStartDate <= now && endDate >= now) {
          status = 'active';
      } else if (currentStartDate > now) {
          status = 'pending';
      }

      // Random cancellation
      if (Math.random() < 0.1 && status !== 'active') {
          status = 'cancelled';
      }

      const booking = await prisma.booking.create({
        data: {
          userId: user.id,
          apartmentId: apt.id,
          residentName: guest.residentName,
          residentId: guest.residentId,
          phone: guest.phone,
          pricePerNight: avgPricePerNight, // average for display
          totalPrice: calculatedTotalPrice,
          startDate: currentStartDate,
          endDate: endDate,
          status: status,
          createdAt: new Date(currentStartDate.getTime() - randomInt(1, 14) * 24 * 60 * 60 * 1000), // Booked 1-14 days before start
        }
      });

      // Payments
      if (status !== 'cancelled') {
         await prisma.payment.create({
             data: {
                 bookingId: booking.id,
                 userId: user.id,
                 amount: calculatedTotalPrice,
                 date: booking.createdAt,
                 type: 'payment',
                 method: randomChoice(['cash', 'card', 'transfer'])
             }
         });
      } else {
          // Maybe they paid and were refunded
          if (Math.random() > 0.5) {
             await prisma.payment.create({
                 data: {
                     bookingId: booking.id,
                     userId: user.id,
                     amount: calculatedTotalPrice,
                     date: booking.createdAt,
                     type: 'payment',
                     method: randomChoice(['card', 'transfer'])
                 }
             });
             await prisma.payment.create({
                 data: {
                     bookingId: booking.id,
                     userId: user.id,
                     amount: -calculatedTotalPrice,
                     date: currentStartDate,
                     type: 'refund',
                     method: 'transfer'
                 }
             });
          }
      }

      currentStartDate = new Date(endDate); // Next booking can start after this one
    }

    // Maintenance Issues
    const numIssues = randomInt(1, 4);
    for(let j=0; j<numIssues; j++) {
        const reportedDate = randomDateBetween(sixMonthsAgo, now);
        const resolvedDate = new Date(reportedDate.getTime() + randomInt(1, 5) * 24 * 60 * 60 * 1000);
        await prisma.maintenanceIssue.create({
            data: {
                apartmentId: apt.id,
                userId: user.id,
                title: `Routine ${randomChoice(MAINTENANCE_CATEGORIES)} issue`,
                category: randomChoice(MAINTENANCE_CATEGORIES),
                cost: randomInt(50, 500),
                status: 'resolved',
                reportedAt: reportedDate,
                resolvedAt: resolvedDate,
                createdAt: reportedDate
            }
        });
    }
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
