const fs = require('fs');

let content = fs.readFileSync('src/components/views/SettingsView.jsx', 'utf8');

// There is a missing parenthesis somewhere. Let's find it.
// React components must wrap JSX blocks returned by &&.
