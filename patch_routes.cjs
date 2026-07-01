const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

if (!code.includes('PublicBookingView')) {
    code = code.replace("import Layout from './components/layout/Layout';", "import Layout from './components/layout/Layout';\nimport PublicBookingView from './components/views/PublicBookingView';");

    code = code.replace("<Route path=\"/login\" element={<LoginView />} />", "<Route path=\"/login\" element={<LoginView />} />\n              <Route path=\"/book/:adminId\" element={<PublicBookingView />} />");
}

fs.writeFileSync('src/App.jsx', code);
