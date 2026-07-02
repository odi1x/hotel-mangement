const fs = require('fs');
let code = fs.readFileSync('src/components/views/ApartmentsView.jsx', 'utf8');

const stateDecls = `  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [activeApartmentForPhotos, setActiveApartmentForPhotos] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showAdvancedFinancials, setShowAdvancedFinancials] = useState(false);`;

code = code.replace("  const [isModalOpen, setIsModalOpen] = useState(false);", stateDecls);

fs.writeFileSync('src/components/views/ApartmentsView.jsx', code);
