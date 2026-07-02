const fs = require('fs');
let code = fs.readFileSync('src/components/views/ApartmentsView.jsx', 'utf8');

const regexResult = code.match(/const \[isModalOpen, setIsModalOpen\] = useState\(false\);\n  const \[showPhotoModal, setShowPhotoModal\] = useState\(false\);\n  const \[activeApartmentForPhotos, setActiveApartmentForPhotos\] = useState\(null\);\n/);
console.log("Regex matched?", !!regexResult);
