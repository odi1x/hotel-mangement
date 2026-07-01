const fs = require('fs');

let code = fs.readFileSync('src/components/views/ApartmentsView.jsx', 'utf8');
code = code.replace("        );\n        })}\n", "          );\n        })}\n");
fs.writeFileSync('src/components/views/ApartmentsView.jsx', code);
