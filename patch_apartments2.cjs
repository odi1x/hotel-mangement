const fs = require('fs');
let code = fs.readFileSync('src/components/views/ApartmentsView.jsx', 'utf8');

// standardizing font sizes and bold states across the 4 top KPI cards
code = code.replace(/text-3xl font-black text-gray-800/g, 'text-2xl font-black text-gray-800');
code = code.replace(/text-3xl font-black text-blue-600/g, 'text-2xl font-black text-blue-600');
code = code.replace(/text-3xl font-black text-green-600/g, 'text-2xl font-black text-green-600');
code = code.replace(/text-3xl font-black text-amber-600/g, 'text-2xl font-black text-amber-600');

fs.writeFileSync('src/components/views/ApartmentsView.jsx', code);
