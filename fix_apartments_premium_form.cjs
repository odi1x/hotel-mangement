const fs = require('fs');

let code = fs.readFileSync('src/components/views/ApartmentsView.jsx', 'utf8');

// 1. Add new state for the form
const stateImports = `const [showAdvancedFinancials, setShowAdvancedFinancials] = useState(false);
  const [isUploading, setIsUploading] = useState(false);`;

code = code.replace("const [showPhotoModal, setShowPhotoModal] = useState(false);", "const [showPhotoModal, setShowPhotoModal] = useState(false);\n" + stateImports);

// 2. Add ImageKit logic inside `ApartmentsView.jsx` (reusing what we had in PhotoManagementModal but inside the main form)
// We already have `formData.images` and `formData.coverPhoto` handled? We need to make sure `setFormData` initializes them.
// Let's modify `handleOpenModal` to include them.

code = code.replace("images: apt.images || [],", "images: apt.images || [], coverPhoto: apt.coverPhoto || null,");

const uploadLogic = `
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('الرجاء اختيار صورة صالحة');

    setIsUploading(true);
    try {
      const authRes = await axios.get('/api/auth?action=imagekit-auth');
      const { token, expire, signature } = authRes.data;

      const fd = new FormData();
      fd.append('file', file);
      fd.append('fileName', file.name);
      fd.append('publicKey', import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY || 'public_dummy');
      fd.append('signature', signature);
      fd.append('expire', expire);
      fd.append('token', token);
      fd.append('folder', '/apartments');

      const uploadRes = await axios.post('https://upload.imagekit.io/api/v1/files/upload', fd);
      const imageUrl = uploadRes.data.url;

      const newImages = [...(formData.images || []), imageUrl];
      setFormData(prev => ({
        ...prev,
        images: newImages,
        coverPhoto: prev.coverPhoto ? prev.coverPhoto : imageUrl
      }));
      toast.success('تم رفع الصورة');
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء الرفع');
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (url) => {
    const newImages = formData.images.filter(img => img !== url);
    setFormData(prev => ({
      ...prev,
      images: newImages,
      coverPhoto: prev.coverPhoto === url ? (newImages[0] || null) : prev.coverPhoto
    }));
  };
`;

code = code.replace("const handleSave = async (e) => {", uploadLogic + "\n\n  const handleSave = async (e) => {");

// 3. Inject the Premium Image Upload section into the form right after Basic Info
const imageUploadSection = `
              {/* Premium Image Upload Section */}
              <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-slate-800">
                <h3 className="font-bold text-gray-800 dark:text-slate-100 pb-2">صور الوحدة</h3>
                <div className="border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-xl p-6 text-center hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors relative">
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className={\`p-3 rounded-full \${isUploading ? 'bg-blue-100 animate-pulse' : 'bg-blue-50 dark:bg-slate-800'}\`}>
                      <ImageIcon size={24} className={\`\${isUploading ? 'text-blue-600' : 'text-blue-500'}\`} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-700 dark:text-slate-300 text-sm">
                        {isUploading ? 'جاري الرفع...' : 'اسحب الصور هنا أو اضغط للتصفح'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Image Previews */}
                {formData.images && formData.images.length > 0 && (
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {formData.images.map((url, idx) => (
                      <div key={idx} className={\`relative shrink-0 w-24 h-24 rounded-lg overflow-hidden border-2 \${formData.coverPhoto === url ? 'border-blue-500 shadow-md' : 'border-transparent'}\`}>
                        <img src={url} className="w-full h-full object-cover" alt="preview" />
                        <button
                          type="button"
                          onClick={() => removeImage(url)}
                          className="absolute top-1 right-1 bg-red-500/90 text-white p-1 rounded-md hover:bg-red-600 transition-colors"
                        >
                          <X size={12} />
                        </button>
                        {formData.coverPhoto !== url && (
                          <button
                            type="button"
                            onClick={() => setFormData({...formData, coverPhoto: url})}
                            className="absolute bottom-1 left-1 right-1 bg-black/60 text-white text-[10px] py-1 rounded text-center hover:bg-black/80"
                          >
                            تعيين غلاف
                          </button>
                        )}
                        {formData.coverPhoto === url && (
                          <div className="absolute bottom-1 left-1 right-1 bg-blue-500 text-white text-[10px] py-1 rounded text-center">
                            الصورة الرئيسية
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
`;

code = code.replace(/<div className="space-y-4 pt-4">\n                <h3 className="font-bold text-gray-800 dark:text-slate-100 border-b pb-2">التكاليف والمالية \(اختياري\)<\/h3>/, imageUploadSection + `\n              {/* Collapsible Financial Section */}\n              <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-slate-800">\n                <button \n                  type="button" \n                  onClick={() => setShowAdvancedFinancials(!showAdvancedFinancials)}\n                  className="w-full flex justify-between items-center font-bold text-gray-800 dark:text-slate-100 pb-2"\n                >\n                  <span>التكاليف والمالية (إعدادات متقدمة)</span>\n                  <span className="text-gray-400">{showAdvancedFinancials ? '🔼' : '🔽'}</span>\n                </button>\n\n                <div className={\`transition-all duration-300 overflow-hidden \${showAdvancedFinancials ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}\`}>\n                  <div className="space-y-4 pt-2">`);

// Close the collapsible wrapper after the financial section
code = code.replace(/<div className="grid grid-cols-2 gap-4">\n                  <div>\n                    <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">عمولات المنصات \(لكل حجز\)<\/label>[\s\S]*?<\/div>\n                <\/div>\n              <\/div>\n\n              <button type="submit"/, `                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">عمولات المنصات (لكل حجز)</label>
                    <div className="flex space-x-reverse space-x-2">
                        <input type="number" placeholder="العمولة" className="w-2/3 px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 dark:text-slate-100 transition-all" value={formData.platformFee} onChange={(e) => setFormData({...formData, platformFee: e.target.value})} />
                        <select className="w-1/3 px-2 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 dark:text-slate-100 transition-all text-sm" value={formData.platformFeeType} onChange={(e) => setFormData({...formData, platformFeeType: e.target.value})}>
                            <option value="percentage">نسبة %</option>
                            <option value="fixed">مبلغ ثابت</option>
                        </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">مصاريف أخرى (لكل حجز)</label>
                    <div className="flex space-x-reverse space-x-2">
                        <input type="text" placeholder="الاسم (مثال: ضيافة)" className="w-1/2 px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 dark:text-slate-100 transition-all text-sm" value={formData.otherExpenseLabel} onChange={(e) => setFormData({...formData, otherExpenseLabel: e.target.value})} />
                        <input type="number" placeholder="المبلغ" className="w-1/2 px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 dark:text-slate-100 transition-all" value={formData.otherExpenseAmount} onChange={(e) => setFormData({...formData, otherExpenseAmount: e.target.value})} />
                    </div>
                  </div>
                </div>
                  </div>
                </div>
              </div>

              <button type="submit"`);

fs.writeFileSync('src/components/views/ApartmentsView.jsx', code);
