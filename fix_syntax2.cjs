const fs = require('fs');
let code = fs.readFileSync('src/components/views/ApartmentsView.jsx', 'utf8');

// We have `        ); \n      })}`
// We should check what map statement it closes. `paginatedApartments.map((apt) => {`
// Let's replace it with exactly this so Rolldown is happy:
code = code.replace("        );\n      })}\n", "        );\n        })}\n");

fs.writeFileSync('src/components/views/ApartmentsView.jsx', code);
