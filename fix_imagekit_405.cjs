const fs = require('fs');

let authCode = fs.readFileSync('api/auth.js', 'utf8');
authCode = authCode.replace("if (action === 'imagekit_auth'", "if (action === 'imagekit-auth'");
fs.writeFileSync('api/auth.js', authCode);
