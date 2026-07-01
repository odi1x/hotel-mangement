const fs = require('fs');
let code = fs.readFileSync('src/components/views/ApartmentsView.jsx', 'utf8');

// The error is actually in the original mapping `paginatedApartments.map((apt) => {`
// Let's see what is inside:
//           <div key={apt.id} className={\`...
// ...
//           </div>
//           );
//         })}
// This looks correct.
// Oh wait. I added a new <div key={apt.id} ...> inside patch_apartments.js
// Let's check how patch_apartments.js replaced the originalCardStart.
// originalCardStart ended with `            <div className="flex justify-between items-start mb-3">`;
// newCardStart ended with `            <div className="p-4 flex flex-col flex-1">\n              <div className="flex justify-between items-start mb-1">`;
// BUT the original block had `</div>` inside `<div className="flex justify-between items-start mb-3">` for the action buttons.
// Then I ran code = code.replace(/<div className="flex space-x-reverse space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">[\s\S]*?<\/div>\n            <\/div>\n            <h3/g, "</div>\n            <h3");
// This might have unbalanced the divs!

// Let's just fix it manually.
code = code.replace("        {paginatedApartments.map((apt) => {\n          const isNotClean = apt.needsCleaning;\n\n          return (\n          <div key={apt.id} className={`bg-white dark:bg-slate-900 rounded-2xl shadow-sm border ${isNotClean ? 'border-gray-100 dark:border-slate-800 border-r-4 border-r-amber-500' : 'border-gray-100 dark:border-slate-800'} flex flex-col h-full relative group transition-all hover:shadow-md overflow-hidden`}>\n            {/* Top Half: Photo */}\n            <div \n                className=\"w-full h-40 bg-gray-200 dark:bg-slate-800 relative cursor-pointer group-hover:brightness-95 transition-all\"\n                onClick={() => handleOpenPhotoModal(apt)}\n            >\n                {apt.coverPhoto ? (\n                    <img src={apt.coverPhoto} alt={apt.name} className=\"w-full h-full object-cover\" />\n                ) : (\n                    <div className=\"w-full h-full flex flex-col items-center justify-center text-gray-400\">\n                        <ImageIcon size={32} className=\"mb-2 opacity-50\" />\n                        <span className=\"text-xs font-bold\">أضف صورة</span>\n                    </div>\n                )}\n                {/* Overlay actions */}\n                <div className=\"absolute top-2 right-2 flex space-x-reverse space-x-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 dark:bg-slate-900/90 rounded-lg p-1 backdrop-blur-sm\">\n                    {(user?.role === 'admin' || user?.permissions?.canEdit) && (\n                    <button\n                        onClick={(e) => { e.stopPropagation(); handleOpenModal(apt); }}\n                        className=\"text-gray-600 dark:text-gray-300 hover:text-blue-600 p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-colors\"\n                    >\n                        <Edit3 size={16} />\n                    </button>\n                    )}\n                    {(user?.role === 'admin' || user?.permissions?.canDelete) && (\n                    <button\n                        onClick={(e) => { e.stopPropagation(); handleDelete(apt.id); }}\n                        className=\"text-gray-600 dark:text-gray-300 hover:text-red-500 p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors\"\n                    >\n                        <Trash2 size={16} />\n                    </button>\n                    )}\n                </div>\n                {isNotClean && (\n                    <div className=\"absolute bottom-2 right-2\">\n                        <span className=\"bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-1 rounded-md shadow-sm\">\n                            تحتاج لتنظيف\n                        </span>\n                    </div>\n                )}\n            </div>\n\n            {/* Bottom Half: Meta */}\n            <div className=\"p-4 flex flex-col flex-1\">\n              <div className=\"flex justify-between items-start mb-1\">", `        {paginatedApartments.map((apt) => {
          const isNotClean = apt.needsCleaning;

          return (
          <div key={apt.id} className={\`bg-white dark:bg-slate-900 rounded-2xl shadow-sm border \${isNotClean ? 'border-gray-100 dark:border-slate-800 border-r-4 border-r-amber-500' : 'border-gray-100 dark:border-slate-800'} flex flex-col h-full relative group transition-all hover:shadow-md overflow-hidden\`}>
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
              <div className="flex justify-between items-start mb-1">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"><Home size={20} /></div>
                </div>
              </div>`);

code = code.replace(`              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"><Home size={20} /></div>
                {isNotClean && (
                  <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-1 rounded-md">
                    تحتاج لتنظيف
                  </span>
                )}
              </div>
</div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100">{apt.name}</h3>`, `            <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100">{apt.name}</h3>`);

fs.writeFileSync('src/components/views/ApartmentsView.jsx', code);
