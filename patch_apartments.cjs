const fs = require('fs');
let code = fs.readFileSync('src/components/views/ApartmentsView.jsx', 'utf8');

if (!code.includes('import PhotoManagementModal')) {
    code = code.replace("import React, { useState, useEffect, useMemo } from 'react';", "import React, { useState, useEffect, useMemo } from 'react';\nimport PhotoManagementModal from '../ui/PhotoManagementModal';");
}

code = code.replace("const [showModal, setShowModal] = useState(false);", "const [showModal, setShowModal] = useState(false);\n  const [showPhotoModal, setShowPhotoModal] = useState(false);\n  const [activeApartmentForPhotos, setActiveApartmentForPhotos] = useState(null);");

const modalHandler = `const handleOpenPhotoModal = (apt) => {
    setActiveApartmentForPhotos(apt);
    setShowPhotoModal(true);
  };

  const handleSavePhotos = async (photoData) => {
    try {
      const response = await axios.put('/api/apartments', {
        ...activeApartmentForPhotos,
        images: photoData.images,
        coverPhoto: photoData.coverPhoto
      });
      refreshData();
      setShowPhotoModal(false);
      toast.success('تم تحديث الصور بنجاح');
    } catch (error) {
      toast.error('حدث خطأ أثناء حفظ الصور');
    }
  };`;

if (!code.includes('handleOpenPhotoModal')) {
    code = code.replace("const handleOpenModal = (apt = null) => {", modalHandler + "\n\n  const handleOpenModal = (apt = null) => {");
}

const originalCardStart = `<div key={apt.id} className={\`bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border \${isNotClean ? 'border-gray-100 dark:border-slate-800 border-r-4 border-r-amber-500' : 'border-gray-100 dark:border-slate-800'} flex flex-col h-full relative group transition-all hover:shadow-md\`}>
            <div className="flex justify-between items-start mb-3">`;

const newCardStart = `<div key={apt.id} className={\`bg-white dark:bg-slate-900 rounded-2xl shadow-sm border \${isNotClean ? 'border-gray-100 dark:border-slate-800 border-r-4 border-r-amber-500' : 'border-gray-100 dark:border-slate-800'} flex flex-col h-full relative group transition-all hover:shadow-md overflow-hidden\`}>
            {/* Top Half: Photo */}
            <div
                className="w-full h-40 bg-gray-200 dark:bg-slate-800 relative cursor-pointer group-hover:brightness-95 transition-all"
                onClick={() => handleOpenPhotoModal(apt)}
            >
                {apt.coverPhoto ? (
                    <img src={apt.coverPhoto} alt={apt.name} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                        <ImageIcon size={32} className="mb-2 opacity-50" />
                        <span className="text-xs font-bold">أضف صورة</span>
                    </div>
                )}
                {/* Overlay actions */}
                <div className="absolute top-2 right-2 flex space-x-reverse space-x-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 dark:bg-slate-900/90 rounded-lg p-1 backdrop-blur-sm">
                    {(user?.role === 'admin' || user?.permissions?.canEdit) && (
                    <button
                        onClick={(e) => { e.stopPropagation(); handleOpenModal(apt); }}
                        className="text-gray-600 dark:text-gray-300 hover:text-blue-600 p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-colors"
                    >
                        <Edit3 size={16} />
                    </button>
                    )}
                    {(user?.role === 'admin' || user?.permissions?.canDelete) && (
                    <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(apt.id); }}
                        className="text-gray-600 dark:text-gray-300 hover:text-red-500 p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
                    >
                        <Trash2 size={16} />
                    </button>
                    )}
                </div>
                {isNotClean && (
                    <div className="absolute bottom-2 right-2">
                        <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-1 rounded-md shadow-sm">
                            تحتاج لتنظيف
                        </span>
                    </div>
                )}
            </div>

            {/* Bottom Half: Meta */}
            <div className="p-4 flex flex-col flex-1">
              <div className="flex justify-between items-start mb-1">`;

code = code.replace(originalCardStart, newCardStart);

// Remove the old action buttons block inside the card body
code = code.replace(/<div className="flex space-x-reverse space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">[\s\S]*?<\/div>\n            <\/div>\n            <h3/g, "</div>\n            <h3");

// Add modal
if (!code.includes('PhotoManagementModal apartment={activeApartmentForPhotos}')) {
    code = code.replace("{showModal && (", "{showPhotoModal && activeApartmentForPhotos && (\n        <PhotoManagementModal\n          apartment={activeApartmentForPhotos}\n          onClose={() => setShowPhotoModal(false)}\n          onSave={handleSavePhotos}\n        />\n      )}\n\n      {showModal && (");
}

fs.writeFileSync('src/components/views/ApartmentsView.jsx', code);
