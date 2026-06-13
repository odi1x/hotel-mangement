const fs = require('fs');
let content = fs.readFileSync('src/components/views/ResidentsView.jsx', 'utf8');

if (!content.includes('checkoutModalOpen')) {
  // It didn't replace the end properly maybe? Let's check if checkoutModalOpen is there
}

if (!content.includes('checkoutModalOpen')) {
  console.log('Replacing again');
} else {
  // Since it replaced before closing div, but the end of ResidentsView is actually a Fragment </>, we might have a syntax error or misplaced HTML.
  // Let's re-read and fix the placement if needed.
}
