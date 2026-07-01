const fs = require('fs');
let code = fs.readFileSync('src/components/views/ApartmentsView.jsx', 'utf8');

// There is a missing </div> for `{/* Bottom Half: Meta */}`
const oldMetaStart = `{/* Bottom Half: Meta */}
            <div className="p-4 flex flex-col flex-1">
              <div className="flex justify-between items-start mb-2">`;

// Need to check where it closes.
// `</div>` is needed before `</div>\n          );\n        })}`

code = code.replace("        );\n        })}", "          </div>\n        );\n        })}");
fs.writeFileSync('src/components/views/ApartmentsView.jsx', code);
