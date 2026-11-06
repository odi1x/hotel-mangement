import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ImageUpload from '../ui/ImageUpload';
import toast from 'react-hot-toast';
import logoWide from '../../assets/brand/logo.png';

const DEMO_ACCOUNT = 'demo';
const DEMO_STAFF_ACCOUNT = 'demo.frontdesk';
const DEMO_PASSWORD = 'demo1234';

export default function LoginView() {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [profilePicture, setProfilePicture] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (submitting) return;
    setSubmitting(true);
    try {
      if (isLogin) {
        const user = await login(username, password);
        toast.success(`مرحباً بك ${user.name || user.username}`);
      } else {
        if (!name.trim()) {
          setError('الاسم الكامل مطلوب');
          return;
        }
        const user = await register({ username, password, name, profilePicture });
        toast.success(`مرحباً بك ${user.name || user.username}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ ما');
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = (user = DEMO_ACCOUNT) => {
    setIsLogin(true);
    setUsername(user);
    setPassword(DEMO_PASSWORD);
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas dark:bg-surface-dark p-4" dir="rtl">
      <div className="bg-canvas dark:bg-surface-dark-elevated p-6 md:p-8 rounded-xl shadow-soft w-full max-w-md border border-hairline dark:border-hairline-dark-soft">
        <div className="flex flex-col items-center mb-6 md:mb-8">
          <img src={logoWide} alt="رنت فلو" className="h-20 object-contain mb-4" />
          <h1 className="text-2xl font-semibold tracking-tight text-ink dark:text-white">رنت فلو</h1>
          <p className="text-muted dark:text-body-dark text-sm mt-2">نظام إدارة الضيافة</p>
        </div>

        {isLogin && (
          <div className="mb-5 rounded-lg border border-hairline dark:border-hairline-dark-soft bg-surface-soft dark:bg-surface-dark p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="eyebrow text-2xs text-muted-soft dark:text-body-dark">نسخة العرض التجريبية</span>
              <span className="text-2xs text-muted-soft dark:text-body-dark">حساب جاهز ببيانات كاملة</span>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
              <dt className="text-muted dark:text-body-dark">اسم المستخدم</dt>
              <dd className="font-mono text-ink dark:text-white">{DEMO_ACCOUNT}</dd>
              <dt className="text-muted dark:text-body-dark">كلمة المرور</dt>
              <dd className="font-mono text-ink dark:text-white">{DEMO_PASSWORD}</dd>
            </dl>
            <div className="flex items-center gap-2 mt-3">
              <button
                type="button"
                onClick={() => fillDemo()}
                className="btn-secondary flex-1 h-10 text-sm"
              >
                تعبئة بيانات الدخول
              </button>
              <button
                type="button"
                onClick={() => fillDemo(DEMO_STAFF_ACCOUNT)}
                className="text-sm link-accent hover:underline whitespace-nowrap"
              >
                دخول كموظف
              </button>
            </div>
          </div>
        )}

        {error && <div className="bg-surface-card dark:bg-surface-dark border border-hairline dark:border-hairline-dark-soft text-ink dark:text-white p-3 rounded-md mb-4 text-sm text-center">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="flex flex-col items-center mb-6">
              <label className="block text-sm font-semibold text-body dark:text-body-dark mb-3">الصورة الشخصية (اختياري)</label>
              <ImageUpload
                onUploadSuccess={url => setProfilePicture(url)}
                currentImage={profilePicture}
              />
            </div>
          )}
          {!isLogin && (
            <div>
              <label className="block text-sm font-semibold text-body dark:text-body-dark mb-1.5">الاسم الكامل</label>
              <input
                required={!isLogin}
                type="text"
                className="input-field h-11 text-base"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-semibold text-body dark:text-body-dark mb-1.5">اسم المستخدم</label>
            <input
              name="username"
              required
              type="text"
              autoComplete="username"
              className="input-field h-11 text-base"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-body dark:text-body-dark mb-1.5">كلمة المرور</label>
            <input
              name="password"
              required
              type="password"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              className="input-field h-11 text-base"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full h-12 text-base mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <span className="inline-flex items-center justify-center gap-2">
                <Loader2 size={18} className="animate-spin" />
                {isLogin ? 'جاري تسجيل الدخول...' : 'جاري إنشاء الحساب...'}
              </span>
            ) : (
              isLogin ? 'تسجيل الدخول' : 'إنشاء حساب'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            disabled={submitting}
            className="text-sm link-accent hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLogin ? 'ليس لديك حساب؟ إنشاء حساب جديد' : 'لديك حساب بالفعل؟ تسجيل الدخول'}
          </button>
        </div>
      </div>
    </div>
  );
}
