const fs = require('fs');

let code = fs.readFileSync('src/components/views/ApartmentsView.jsx', 'utf8');

// There are extra ')' or '}' in the map return. Let's fix the block completely.
const wrongBlockRegex = /          \);\n        \}\)}\n/g;
code = code.replace(wrongBlockRegex, "          );\n        })}\n");

fs.writeFileSync('src/components/views/ApartmentsView.jsx', code);
