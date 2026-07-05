import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Home } from 'lucide-react';
import ImageUpload from '../ui/ImageUpload';
import toast from 'react-hot-toast';

export default function LoginView() {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [profilePicture, setProfilePicture] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) {
        const user = await login(username, password);
        toast.success(`مرحباً بك ${user.name || user.username}`);
      } else {
        if (!name.trim()) {
          return setError('الاسم الكامل مطلوب');
        }
        const user = await register({ username, password, name, profilePicture });
        toast.success(`مرحباً بك ${user.name || user.username}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ ما');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas dark:bg-surface-dark p-4" dir="rtl">
      <div className="bg-canvas dark:bg-surface-dark-elevated p-8 rounded-xl shadow-soft w-full max-w-md border border-hairline dark:border-[#2e2e2e]">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-accent p-3 rounded-md mb-4 shadow-soft">
            <Home className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink dark:text-white">رنت فلو</h1>
          <p className="text-muted dark:text-[#a1a1aa] text-sm mt-2">نظام إدارة الضيافة</p>
        </div>

        {error && <div className="bg-surface-card dark:bg-surface-dark border border-hairline dark:border-[#2e2e2e] text-ink dark:text-white p-3 rounded-md mb-4 text-sm text-center">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="flex flex-col items-center mb-6">
              <label className="block text-sm font-semibold text-body dark:text-[#a1a1aa] mb-3">الصورة الشخصية (اختياري)</label>
              <ImageUpload
                onUploadSuccess={url => setProfilePicture(url)}
                currentImage={profilePicture}
              />
            </div>
          )}
          {!isLogin && (
            <div>
              <label className="block text-sm font-semibold text-body dark:text-[#a1a1aa] mb-1.5">الاسم الكامل</label>
              <input
                required={!isLogin}
                type="text"
                className="input-field"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-semibold text-body dark:text-[#a1a1aa] mb-1.5">اسم المستخدم</label>
            <input
              name="username"
              required
              type="text"
              className="input-field"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-body dark:text-[#a1a1aa] mb-1.5">كلمة المرور</label>
            <input
              name="password"
              required
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="btn-primary w-full h-11 text-base mt-2"
          >
            {isLogin ? 'تسجيل الدخول' : 'إنشاء حساب'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm link-accent hover:underline"
          >
            {isLogin ? 'ليس لديك حساب؟ إنشاء حساب جديد' : 'لديك حساب بالفعل؟ تسجيل الدخول'}
          </button>
        </div>
      </div>
    </div>
  );
}
