const fs = require('fs');
let code = fs.readFileSync('src/components/views/ApartmentsView.jsx', 'utf8');

if (!code.includes('Share2')) {
    code = code.replace("Image as ImageIcon", "Image as ImageIcon, Share2, Copy");
}

const shareLinkSection = `
      {/* Header and Share Link */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-black text-gray-800 dark:text-white">إدارة الشقق</h1>
        <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-2 px-4 rounded-xl">
          <div className="bg-white dark:bg-slate-800 p-1.5 rounded-lg shadow-sm">
            <Share2 size={18} className="text-blue-600" />
          </div>
          <div className="text-sm">
            <p className="text-[10px] text-blue-500 font-bold uppercase mb-0.5">رابط الحجز العام الخاص بك</p>
            <div className="flex items-center gap-2">
              <span className="font-mono text-gray-700 dark:text-gray-300 select-all" dir="ltr">
                {window.location.origin}/book/{user?.adminId || user?.id}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(\`\${window.location.origin}/book/\${user?.adminId || user?.id}\`);
                  toast.success('تم نسخ الرابط');
                }}
                className="text-gray-400 hover:text-blue-600 transition-colors"
                title="نسخ الرابط"
              >
                <Copy size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
`;

code = code.replace('<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 shrink-0">', shareLinkSection + '\n      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 shrink-0">');

fs.writeFileSync('src/components/views/ApartmentsView.jsx', code);
