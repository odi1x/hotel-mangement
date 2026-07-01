const fs = require('fs');
let code = fs.readFileSync('src/components/views/ApartmentsView.jsx', 'utf8');

const replacement = `
      {showPhotoModal && activeApartmentForPhotos && (
        <PhotoManagementModal
          apartment={activeApartmentForPhotos}
          onClose={() => setShowPhotoModal(false)}
          onSave={handleSavePhotos}
        />
      )}

      {isModalOpen && (
`;

code = code.replace(/\{isModalOpen && \(/, replacement);

fs.writeFileSync('src/components/views/ApartmentsView.jsx', code);
