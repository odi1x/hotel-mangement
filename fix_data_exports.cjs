const fs = require('fs');

let content = fs.readFileSync('src/context/DataContext.jsx', 'utf8');

content = content.replace(
  'toggleTrustedStatus,',
  `toggleTrustedStatus,
      fetchBookings,
      fetchApartments,
      staffExpenses,
      fetchStaffExpenses,`
);

fs.writeFileSync('src/context/DataContext.jsx', content, 'utf8');
console.log('Fixed DataContext exports');
