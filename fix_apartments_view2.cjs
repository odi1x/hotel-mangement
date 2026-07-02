const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/components/views/ApartmentsView.jsx');
let content = fs.readFileSync(file, 'utf8');

// Fix "Identifier 'useData' has already been declared"
// It probably added another import of useData because it used replace blindly.
content = content.replace(/import \{ useData \} from '\.\.\/\.\.\/context\/DataContext';\nimport \{ useData \} from '\.\.\/\.\.\/context\/DataContext';/, "import { useData } from '../../context/DataContext';");

// Remove double useData if exists across lines
const lines = content.split('\n');
const useDataLines = lines.filter(l => l.includes("import { useData } from '../../context/DataContext'"));
if (useDataLines.length > 1) {
    let first = true;
    content = lines.map(line => {
        if (line.includes("import { useData } from '../../context/DataContext'")) {
            if (first) {
                first = false;
                return line;
            }
            return '';
        }
        return line;
    }).filter(l => l !== '').join('\n');
}

fs.writeFileSync(file, content, 'utf8');
