const fs = require('fs');
let code = fs.readFileSync('src/components/views/ApartmentsView.jsx', 'utf8');
console.log(code.includes('const handleFileUpload'));
console.log(code.includes('const handleOpenPhotoModal'));
