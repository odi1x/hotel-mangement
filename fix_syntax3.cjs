const fs = require('fs');
let code = fs.readFileSync('src/components/views/ApartmentsView.jsx', 'utf8');

// We have `        );\n        })}\n`
// Let's replace it with exactly this so Rolldown is happy:
code = code.replace("        );\n        })}\n", "          );\n        })}\n");

fs.writeFileSync('src/components/views/ApartmentsView.jsx', code);
