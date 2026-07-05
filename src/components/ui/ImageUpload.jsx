import React, { useRef, useState } from 'react';
import { IKContext, IKUpload } from 'imagekitio-react';
import { Camera, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const urlEndpoint = import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/odi1x';
const publicKey = import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY || 'public_3kVK0taiC3rlUo0oMfV39qj9QAM=';

const authenticator = async () => {
  try {
    const response = await fetch('/api/upload/auth');
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Request failed with status ${response.status}: ${errorText}`);
    }
    const data = await response.json();
    const { signature, expire, token } = data;
    return { signature, expire, token };
  } catch (error) {
    throw new Error(`Authentication request failed: ${error.message}`);
  }
};

export default function ImageUpload({ onUploadSuccess, currentImage, className = '' }) {
  const [uploading, setUploading] = useState(false);
  const ikUploadRef = useRef(null);

  const onError = err => {
    console.error('Upload Error:', err);
    setUploading(false);
    toast.error('فشل في تحميل الصورة');
  };

  const onSuccess = res => {
    setUploading(false);
    onUploadSuccess(res.url);
  };

  const handleUploadStart = (evt) => {
    setUploading(true);
  };

  return (
    <IKContext
      publicKey={publicKey}
      urlEndpoint={urlEndpoint}
      authenticator={authenticator}
    >
      <div className={`relative inline-block ${className}`}>
        <div
          className="relative w-24 h-24 rounded-full border border-hairline dark:border-[#2e2e2e] overflow-hidden bg-surface-card dark:bg-surface-dark-elevated flex items-center justify-center cursor-pointer group"
          onClick={() => ikUploadRef.current?.click()}
        >
          {currentImage ? (
            <img src={currentImage} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <Camera className="w-8 h-8 text-muted-soft group-hover:text-ink dark:group-hover:text-white transition-colors" />
          )}

          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera className="w-6 h-6 text-white" />
          </div>

          {uploading && (
            <div className="absolute inset-0 bg-canvas/80 dark:bg-surface-dark/80 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-ink dark:text-white" />
            </div>
          )}
        </div>

        <IKUpload
          fileName="profile.jpg"
          tags={["profile_picture"]}
          useUniqueFileName={true}
          validateFile={file => {
            if (file.size > 5000000) { // 5MB
              toast.error('حجم الصورة يجب أن يكون أقل من 5 ميجابايت');
              return false;
            }
            return true;
          }}
          onError={onError}
          onSuccess={onSuccess}
          onUploadStart={handleUploadStart}
          style={{ display: 'none' }}
          ref={ikUploadRef}
        />
      </div>
    </IKContext>
  );
}