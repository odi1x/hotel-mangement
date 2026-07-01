const fs = require('fs');

let code = fs.readFileSync('src/components/views/ApartmentsView.jsx', 'utf8');

// The user mentioned multiple issues:
// 1. "also i need to upload more than one photo so user can see all the apartment photos"
// We already have `images: String[]` in schema and it is loaded as an array in `PhotoManagementModal.jsx`
// But we need to update the card UI to show that it has multiple photos, maybe an indicator.
// And they said "why there is two home icons"
// Let's remove the redundant Home icon in the bottom half.

// Remove duplicate home icon from bottom half
code = code.replace(/<div className="flex items-center gap-3">\n                  <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900\/30 text-blue-600 dark:text-blue-400"><Home size={18} \/><\/div>\n                  <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100">{apt.name}<\/h3>\n                <\/div>/, '<h3 className="text-lg font-bold text-gray-800 dark:text-slate-100">{apt.name}</h3>');

// They said "the margen loks weried too".
// Let's add an indicator for multiple photos and check margins.
const photoIndicator = `
                {apt.images && apt.images.length > 1 && (
                  <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded-md backdrop-blur-sm flex items-center gap-1">
                    <ImageIcon size={12} />
                    <span>+{apt.images.length - 1}</span>
                  </div>
                )}
`;

// Insert the photo indicator after the coverPhoto image
code = code.replace(/<img src={apt.coverPhoto} alt={apt.name} className="w-full h-full object-cover" \/>\n                \) : \(/, '<img src={apt.coverPhoto} alt={apt.name} className="w-full h-full object-cover" />\n                ' + photoIndicator + '\n                ) : (');

// Let's also check if PhotoManagementModal allows saving all images
// It does: `onSave({ images, coverPhoto })` updates `apartment.images` and `apartment.coverPhoto`.

fs.writeFileSync('src/components/views/ApartmentsView.jsx', code);
