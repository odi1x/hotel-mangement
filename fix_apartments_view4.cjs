const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/components/views/ApartmentsView.jsx');
let content = fs.readFileSync(file, 'utf8');

// The `Copy` component is not used, remove it to resolve lint warning.
content = content.replace(/, Copy/g, '');

fs.writeFileSync(file, content, 'utf8');
