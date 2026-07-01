import { useState } from 'react';
import { X, Upload, Trash2, Image as ImageIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';
import axios from 'axios';


export default function PhotoManagementModal({ apartment, onClose, onSave }) {
  const [images, setImages] = useState(apartment?.images || []);
  const [coverPhoto, setCoverPhoto] = useState(apartment?.coverPhoto || null);
  const [isUploading, setIsUploading] = useState(false);

  // Authenticate and upload to ImageKit
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('الرجاء اختيار صورة صالحة');
      return;
    }

    setIsUploading(true);
    try {
      // 1. Get auth params from our lightweight serverless endpoint
      const authRes = await axios.get('/api/imagekit-auth');
      const { token, expire, signature } = authRes.data;

      // 2. Upload directly to ImageKit using their upload API
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', file.name);
      formData.append('publicKey', import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY); // Note: We need VITE_IMAGEKIT_PUBLIC_KEY in .env
      formData.append('signature', signature);
      formData.append('expire', expire);
      formData.append('token', token);
      formData.append('folder', '/apartments'); // Optional folder organization

      // Use the standard ImageKit upload API URL
      const uploadRes = await axios.post('https://upload.imagekit.io/api/v1/files/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
      });

      const imageUrl = uploadRes.data.url;
      const newImages = [...images, imageUrl];

      setImages(newImages);
      // Auto-set cover photo if it's the first one
      if (!coverPhoto) {
          setCoverPhoto(imageUrl);
      }
      toast.success('تم رفع الصورة بنجاح');
    } catch (error) {
      console.error('Upload Error:', error);
      toast.error('حدث خطأ أثناء رفع الصورة');
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (urlToRemove) => {
    const newImages = images.filter(url => url !== urlToRemove);
    setImages(newImages);
    if (coverPhoto === urlToRemove) {
        setCoverPhoto(newImages.length > 0 ? newImages[0] : null);
    }
  };

  const setAsCover = (url) => {
      setCoverPhoto(url);
  };

  const handleSaveImages = () => {
      onSave({ images, coverPhoto });
  };

  return (
    <div className="fixed inset-0 z-[100] m-0 border-0 outline-none flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <ImageIcon className="text-blue-600" size={24} />
              إدارة صور الوحدة: {apartment?.name}
            </h2>
            <p className="text-sm text-gray-500 mt-1">ارفع الصور واختر صورة الغلاف للواجهة العامة</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
            <X size={20}/>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-6">
          {/* Upload Area */}
          <div className="border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-xl p-8 text-center hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors relative">
            <input
              type="file"
              accept="image/*"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className={`p-4 rounded-full ${isUploading ? 'bg-blue-100 dark:bg-blue-900 animate-pulse' : 'bg-blue-50 dark:bg-slate-800'}`}>
                <Upload size={32} className={`${isUploading ? 'text-blue-600 dark:text-blue-400' : 'text-blue-500'}`} />
              </div>
              <div>
                <p className="font-semibold text-gray-700 dark:text-slate-300">
                  {isUploading ? 'جاري الرفع...' : 'اسحب الصور وأفلتها هنا أو اضغط للاختيار'}
                </p>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">يدعم JPG, PNG, WEBP</p>
              </div>
            </div>
          </div>

          {/* Image Grid */}
          {images.length > 0 && (
            <div>
              <h3 className="font-bold text-gray-800 dark:text-slate-200 mb-4">الصور المرفوعة ({images.length})</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {images.map((url, idx) => (
                  <div key={idx} className={`relative group rounded-xl overflow-hidden aspect-square border-2 ${coverPhoto === url ? 'border-blue-500 shadow-md' : 'border-transparent'}`}>
                    <img src={url} alt={`Apartment photo ${idx + 1}`} className="w-full h-full object-cover" />

                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                      <div className="flex justify-end">
                        <button
                          onClick={() => removeImage(url)}
                          className="bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-lg transition-colors"
                          title="حذف الصورة"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {coverPhoto !== url && (
                        <button
                          onClick={() => setAsCover(url)}
                          className="bg-white/90 hover:bg-white text-gray-800 text-xs font-bold py-1.5 px-2 rounded-lg transition-colors w-full text-center"
                        >
                          تعيين كغلاف
                        </button>
                      )}
                    </div>

                    {coverPhoto === url && (
                      <div className="absolute top-2 left-2 bg-blue-500 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm">
                        صورة الغلاف
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 rounded-b-2xl">
          <button
            onClick={handleSaveImages}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all"
          >
            حفظ الصور
          </button>
        </div>
      </div>
    </div>
  );
}
