const fs = require('fs');

let code = fs.readFileSync('src/components/views/ApartmentsView.jsx', 'utf8');

// It looks like the card was not updated correctly or was overwritten in my manual fixes. Let's rebuild the card layout according to the request.

const oldCardStart = `<div key={apt.id} className={\`bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border \${isNotClean ? 'border-gray-100 dark:border-slate-800 border-r-4 border-r-amber-500' : 'border-gray-100 dark:border-slate-800'} flex flex-col h-full relative group transition-all hover:shadow-md\`}>
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"><Home size={20} /></div>
                {isNotClean && (
                  <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-1 rounded-md">
                    تحتاج لتنظيف
                  </span>
                )}
              </div>
              <div className="flex space-x-reverse space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {(user?.role === 'admin' || user?.permissions?.canEdit) && (
                  <button
                    onClick={() => handleOpenModal(apt)}
                    className="text-gray-400 hover:text-blue-600 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                  >
                    <Edit3 size={18} />
                  </button>
                )}
                {(user?.role === 'admin' || user?.permissions?.canDelete) && (
                  <button
                    onClick={() => handleDelete(apt.id)}
                    className="text-gray-400 hover:text-red-500 p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100">{apt.name}</h3>`;

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
                        title="تعديل"
                    >
                        <Edit3 size={16} />
                    </button>
                    )}
                    {(user?.role === 'admin' || user?.permissions?.canDelete) && (
                    <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(apt.id); }}
                        className="text-gray-600 dark:text-gray-300 hover:text-red-500 p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
                        title="حذف"
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
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"><Home size={18} /></div>
                  <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100">{apt.name}</h3>
                </div>
              </div>`;

code = code.replace(oldCardStart, newCardStart);

fs.writeFileSync('src/components/views/ApartmentsView.jsx', code);
