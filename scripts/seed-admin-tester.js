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
        { name: TARGET_USERNAME } // In case the prompt meant name
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
  for (const template of APARTMENT_TEMPLATES) {
    const apt = await prisma.apartment.create({
      data: {
        userId: user.id,
        name: template.name,
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

  console.log('Generating bookings & payments...');
  const now = new Date();
  const sixMonthsAgo = new Date(now.getTime() - SIX_MONTHS_MS);

  for (const apt of createdApartments) {
    const numBookings = randomInt(5, 12);
    let currentStartDate = new Date(sixMonthsAgo);

    for (let i = 0; i < numBookings; i++) {
      // Add a gap between bookings
      currentStartDate = new Date(currentStartDate.getTime() + randomInt(1, 10) * 24 * 60 * 60 * 1000);

      if (currentStartDate > new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)) {
          break; // Don't go too far into the future
      }

      const stayDurationDays = randomInt(1, 7);
      const endDate = new Date(currentStartDate.getTime() + stayDurationDays * 24 * 60 * 60 * 1000);

      const guest = randomChoice(GUESTS);
      const totalPrice = stayDurationDays * Number(apt.basePrice);

      let status = 'completed';
      if (currentStartDate <= now && endDate >= now) {
          status = 'active';
      } else if (currentStartDate > now) {
          status = 'pending'; // or confirmed depending on your app's logic
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
          pricePerNight: apt.basePrice,
          totalPrice: totalPrice,
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
                 amount: totalPrice,
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
                     amount: totalPrice,
                     date: booking.createdAt,
                     type: 'payment',
                     method: randomChoice(['card', 'transfer'])
                 }
             });
             await prisma.payment.create({
                 data: {
                     bookingId: booking.id,
                     userId: user.id,
                     amount: -totalPrice,
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
