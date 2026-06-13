const fs = require('fs');
let content = fs.readFileSync('api/bookings.js', 'utf8');

const oldCheckout = `      if (isCheckout) {
        // Handle Early Checkout
        const newEndDate = new Date();
        const booking = await prisma.booking.update({
          where: { id },
          data: {
            endDate: newEndDate,
            status: 'checked_out_early',
            // Keep original totalPrice by setting it if not already set
            totalPrice: existing.totalPrice || (existing.pricePerNight * Math.ceil(Math.abs(new Date(existing.endDate) - new Date(existing.startDate)) / (1000 * 60 * 60 * 24)))
          }
        });

        // Also set unit to needs cleaning
        await prisma.apartment.update({
          where: { id: existing.apartmentId },
          data: { needsCleaning: true }
        });

        return res.status(200).json(booking);
      }`;

const newCheckout = `      if (isCheckout) {
        const { financialOption, customDays, reasonNotes } = updateDataObj;

        // Handle Early Checkout
        const newEndDate = new Date();

        let newTotalPrice = existing.totalPrice || (Number(existing.pricePerNight) * Math.ceil(Math.abs(new Date(existing.endDate) - new Date(existing.startDate)) / (1000 * 60 * 60 * 24)));

        if (financialOption === 'recalculate' && customDays !== undefined) {
           newTotalPrice = Number(customDays) * Number(existing.pricePerNight);
        }

        let updatedNotes = existing.notes || '';
        if (reasonNotes && reasonNotes.trim() !== '') {
            updatedNotes += (updatedNotes ? '\\n\\n' : '') + '--- سبب المغادرة المبكرة ---\\n' + reasonNotes;
        }

        const booking = await prisma.booking.update({
          where: { id },
          data: {
            endDate: newEndDate,
            status: 'checked_out_early',
            totalPrice: newTotalPrice,
            notes: updatedNotes
          }
        });

        // Also set unit to needs cleaning
        await prisma.apartment.update({
          where: { id: existing.apartmentId },
          data: { needsCleaning: true }
        });

        return res.status(200).json(booking);
      }`;

content = content.replace(oldCheckout, newCheckout);
fs.writeFileSync('api/bookings.js', content, 'utf8');
console.log('updated');
