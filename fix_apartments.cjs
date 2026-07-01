const fs = require('fs');
let code = fs.readFileSync('src/components/views/ApartmentsView.jsx', 'utf8');

// The error is `Parsing error: Unexpected token }` around line 207.
// It seems there's a missing open bracket or misplaced block.

code = code.replace(/\{showModal && \(/g, '\n      {showModal && (');

fs.writeFileSync('src/components/views/ApartmentsView.jsx', code);
