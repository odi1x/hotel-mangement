const fs = require('fs');
let content = fs.readFileSync('src/components/views/SettingsView.jsx', 'utf8');

content = content.replace(
  '                  <div>\n                    <label className="block text-xs font-bold text-gray-700',
  '                  </div>\n                  <div>\n                    <label className="block text-xs font-bold text-gray-700'
);

fs.writeFileSync('src/components/views/SettingsView.jsx', content, 'utf8');
