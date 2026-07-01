const fs = require('fs');
let code = fs.readFileSync('utils.js', 'utf8');

// We need to allow passing token via query param for EventSource
const newVerifyToken = `export function verifyToken(req) {
  try {
    // Check Authorization header first
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      return decoded;
    }

    // Check URL query parameters (for SSE support)
    const url = new URL(req.url, \`http://\${req.headers.host}\`);
    const tokenQuery = url.searchParams.get('token');
    if (tokenQuery) {
        const decoded = jwt.verify(tokenQuery, JWT_SECRET);
        return decoded;
    }

    return null;
  } catch (error) {
    return null;
  }
}`;

code = code.replace(/export function verifyToken\(req\) \{[\s\S]*?return null;\n  \}\n\}/, newVerifyToken);

fs.writeFileSync('utils.js', code);
