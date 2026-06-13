const fs = require('fs');

let content = fs.readFileSync('src/components/views/ResidentsView.jsx', 'utf8');

// The user requested:
// 1. Reset state completely on cancel

content = content.replace(
  'onClick={() => setCheckoutModalOpen(false)}',
  'onClick={() => { setCheckoutModalOpen(false); setCheckoutData({ id: null, option: \'keep\', days: \'\', notes: \'\', booking: null }); }}'
);
content = content.replace(
  'onClick={() => setCheckoutModalOpen(false)}',
  'onClick={() => { setCheckoutModalOpen(false); setCheckoutData({ id: null, option: \'keep\', days: \'\', notes: \'\', booking: null }); }}'
);

// We also need to add a click handler on the backdrop to close it like click outside (optional but good).
content = content.replace(
  'className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">',
  'className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">\n          <div className="absolute inset-0" onClick={() => { setCheckoutModalOpen(false); setCheckoutData({ id: null, option: \'keep\', days: \'\', notes: \'\', booking: null }); }}></div>'
);

// We need to fix the multi-select dropdown in SettingsView too to close on click outside!
fs.writeFileSync('src/components/views/ResidentsView.jsx', content, 'utf8');
console.log('ResidentsView modal updated');
