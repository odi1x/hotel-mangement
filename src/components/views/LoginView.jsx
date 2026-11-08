import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import logoWide from '../../assets/brand/logo.png';

const DEMO_ACCOUNT = 'demo';
const DEMO_PASSWORD = 'demo1234';

export default function LoginView() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submitLogin = async (user, pass) => {
    setError('');
    if (submitting) return;
    setSubmitting(true);
    try {
      const loggedIn = await login(user, pass);
      toast.success(`مرحباً بك ${loggedIn.name || loggedIn.username}`);
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ ما');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await submitLogin(username, password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas dark:bg-surface-dark p-4" dir="rtl">
      <div className="bg-canvas dark:bg-surface-dark-elevated p-6 md:p-8 rounded-xl shadow-soft w-full max-w-md border border-hairline dark:border-hairline-dark-soft">
        <div className="flex flex-col items-center mb-6 md:mb-8">
          <img src={logoWide} alt="رنت فلو" className="h-20 object-contain mb-4" />
          <h1 className="text-2xl font-semibold tracking-tight text-ink dark:text-white">رنت فلو</h1>
          <p className="text-muted dark:text-body-dark text-sm mt-2">نظام إدارة الضيافة</p>
        </div>

        {error && <div className="bg-surface-card dark:bg-surface-dark border border-hairline dark:border-hairline-dark-soft text-ink dark:text-white p-3 rounded-md mb-4 text-sm text-center">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
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
              autoComplete="current-password"
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
                جاري تسجيل الدخول...
              </span>
            ) : (
              'تسجيل الدخول'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => submitLogin(DEMO_ACCOUNT, DEMO_PASSWORD)}
            disabled={submitting}
            className="text-sm text-muted-soft dark:text-body-dark hover:text-ink dark:hover:text-white hover:underline underline-offset-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            اضغط هنا للدخول بحساب تجريبي جاهز
          </button>
        </div>
      </div>
    </div>
  );
}
