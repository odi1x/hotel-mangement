const fs = require('fs');

let code = fs.readFileSync('src/components/views/ApartmentsView.jsx', 'utf8');

// The functions were somehow lost, probably during the multiple manual replacements.
// Let's inject them again right before `const handleOpenModal = (apt = null) => {`

const functions = `
  const handleOpenPhotoModal = (apt) => {
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
      fetchApartments();
      setShowPhotoModal(false);
      toast.success('تم تحديث الصور بنجاح');
    } catch (error) {
      toast.error('حدث خطأ أثناء حفظ الصور');
    }
  };

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

if (!code.includes('const handleOpenPhotoModal')) {
    code = code.replace("const handleOpenModal = (apt = null) => {", functions + "\n\n  const handleOpenModal = (apt = null) => {");
}

fs.writeFileSync('src/components/views/ApartmentsView.jsx', code);
