import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Home } from 'lucide-react';

export default function LoginView() {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) {
        await login(username, password);
      } else {
        await register(username, password);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ ما');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 p-4" dir="rtl">
      <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100 dark:border-slate-800">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-blue-600 p-3 rounded-xl mb-4 shadow-lg shadow-blue-200 dark:shadow-none">
            <Home className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-black text-gray-800 dark:text-white">رنت فلو</h1>
          <p className="text-gray-500 dark:text-slate-400 text-sm mt-2">نظام إدارة الضيافة</p>
        </div>

        {error && <div className="bg-red-50 text-red-500 p-3 rounded-lg mb-4 text-sm text-center border border-red-100">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">اسم المستخدم</label>
            <input
              required
              type="text"
              className="w-full px-4 py-3 border border-gray-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-slate-800 dark:text-white transition-all"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">كلمة المرور</label>
            <input
              required
              type="password"
              className="w-full px-4 py-3 border border-gray-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-slate-800 dark:text-white transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 dark:shadow-none active:scale-95 mt-2"
          >
            {isLogin ? 'تسجيل الدخول' : 'إنشاء حساب'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-blue-600 hover:text-blue-800 font-semibold"
          >
            {isLogin ? 'ليس لديك حساب؟ إنشاء حساب جديد' : 'لديك حساب بالفعل؟ تسجيل الدخول'}
          </button>
        </div>
      </div>
    </div>
  );
}
